document.addEventListener('DOMContentLoaded', () => {
    // --- Form Validation Logic (index.html) ---
    const form = document.getElementById('id-form');
    if (form) {
        const nameInput = document.getElementById('name');
        const regNoInput = document.getElementById('reg_no');
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');
        const photoInput = document.getElementById('photo');
        const photoPreview = document.getElementById('photo-preview');
        const submitBtn = document.getElementById('submit-btn');

        // Image cropping variables
        let originalImage = null;
        let cropSettings = { zoom: 1, offsetX: 0, offsetY: 0 };
        let processedImageBlob = null;

        const validators = {
            name: {
                el: nameInput,
                validate: () => /^[A-Za-z\s]{2,40}$/.test(nameInput.value),
                message: 'Name must be 2-40 letters and spaces.'
            },
            reg_no: {
                el: regNoInput,
                validate: () => /^[A-Za-z0-9\-_/]{6,20}$/.test(regNoInput.value),
                message: 'Reg No must be 6-20 alphanumeric characters.'
            },
            email: {
                el: emailInput,
                validate: () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value),
                message: 'Please enter a valid email address.'
            },
            phone: {
                el: phoneInput,
                validate: () => /^[\d\s\-\+()]{10,20}$/.test(phoneInput.value),
                message: 'Please enter a valid phone number.'
            },
            photo: {
                el: photoInput,
                validate: () => photoInput.files.length > 0 && photoInput.files[0].size <= 4 * 1024 * 1024,
                message: 'Photo is required and must be under 4 MB.'
            }
        };

        const validateField = (field) => {
            const isValid = field.validate();
            const errorEl = field.el.parentElement.querySelector('.error-message');
            if (isValid) {
                field.el.classList.remove('invalid');
                field.el.classList.add('valid');
                errorEl.textContent = '';
            } else {
                field.el.classList.remove('valid');
                field.el.classList.add('invalid');
                errorEl.textContent = field.message;
            }
            return isValid;
        };

        const validateForm = () => {
            const isFormValid = Object.values(validators).every(field => field.validate());
            submitBtn.disabled = !isFormValid;
        };

        Object.values(validators).forEach(field => {
            field.el.addEventListener('input', () => validateField(field));
        });

        form.addEventListener('input', validateForm);

        // --- Image Cropping Functions ---
        const createHexagonalClipPath = (ctx, width, height) => {
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 2 * 0.7; // Make it smaller to fit in circle overlay

            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
        };

        const updateCropPreview = () => {
            if (!originalImage) return;

            const canvas = document.getElementById('crop-canvas');
            const ctx = canvas.getContext('2d');
            const canvasSize = 200;

            // Clear canvas
            ctx.clearRect(0, 0, canvasSize, canvasSize);

            // Calculate aspect ratio and initial size to match server-side processing
            const imgAspect = originalImage.width / originalImage.height;
            let baseWidth, baseHeight;

            // Use the same logic as server-side ImageOps.fit - fill the entire area
            if (imgAspect > 1) {
                // Landscape image - fill height, crop width
                baseHeight = canvasSize;
                baseWidth = baseHeight * imgAspect;
            } else {
                // Portrait image - fill width, crop height
                baseWidth = canvasSize;
                baseHeight = baseWidth / imgAspect;
            }

            // Apply zoom
            const imgWidth = baseWidth * cropSettings.zoom;
            const imgHeight = baseHeight * cropSettings.zoom;

            // Center the image and apply offsets
            const x = (canvasSize - imgWidth) / 2 + cropSettings.offsetX;
            const y = (canvasSize - imgHeight) / 2 + cropSettings.offsetY;

            // Draw the full image first (no clipping for preview)
            ctx.drawImage(originalImage, x, y, imgWidth, imgHeight);
        };

        const generateProcessedImage = () => {
            if (!originalImage) return null;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const size = 285; // Final size for the ID card
            canvas.width = size;
            canvas.height = size;

            // Calculate image dimensions to match server-side ImageOps.fit behavior
            const imgAspect = originalImage.width / originalImage.height;
            let baseWidth, baseHeight;

            // Fill the entire area like server-side processing
            if (imgAspect > 1) {
                baseHeight = size;
                baseWidth = baseHeight * imgAspect;
            } else {
                baseWidth = size;
                baseHeight = baseWidth / imgAspect;
            }

            const imgWidth = baseWidth * cropSettings.zoom;
            const imgHeight = baseHeight * cropSettings.zoom;

            // Scale offsets proportionally
            const scaleFactor = size / 200;
            const x = (size - imgWidth) / 2 + (cropSettings.offsetX * scaleFactor);
            const y = (size - imgHeight) / 2 + (cropSettings.offsetY * scaleFactor);

            // Create hexagonal clipping path for final image
            ctx.save();
            createHexagonalClipPath(ctx, size, size);
            ctx.clip();

            // Draw the image
            ctx.drawImage(originalImage, x, y, imgWidth, imgHeight);
            ctx.restore();

            return new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/png');
            });
        };

        const updateSliderValues = () => {
            document.getElementById('zoom-value').textContent = `${cropSettings.zoom.toFixed(1)}x`;
            document.getElementById('pos-x-value').textContent = cropSettings.offsetX;
            document.getElementById('pos-y-value').textContent = cropSettings.offsetY;
        };

        // --- Photo Upload and Preview ---
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    // Update main preview
                    photoPreview.src = event.target.result;

                    // Load image for cropping
                    const img = new Image();
                    img.onload = () => {
                        originalImage = img;
                        cropSettings = { zoom: 1, offsetX: 0, offsetY: 0 };
                        processedImageBlob = null; // Reset processed image

                        // Reset sliders
                        document.getElementById('zoom-slider').value = 1;
                        document.getElementById('pos-x-slider').value = 0;
                        document.getElementById('pos-y-slider').value = 0;

                        // Update slider value displays
                        updateSliderValues();

                        // Show crop controls and update preview
                        document.getElementById('crop-controls').classList.add('active');
                        document.getElementById('crop-status').textContent = 'Adjust the sliders to position your photo, then click Apply';
                        document.getElementById('crop-status').classList.remove('applied');

                        updateCropPreview();
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        // --- Crop Control Event Listeners ---
        const cropControls = document.getElementById('crop-controls');
        if (cropControls) {
            const zoomSlider = document.getElementById('zoom-slider');
            const posXSlider = document.getElementById('pos-x-slider');
            const posYSlider = document.getElementById('pos-y-slider');
            const resetBtn = document.getElementById('reset-crop-btn');
            const applyBtn = document.getElementById('apply-crop-btn');

            const updateSettings = () => {
                cropSettings.zoom = parseFloat(zoomSlider.value);
                cropSettings.offsetX = parseInt(posXSlider.value);
                cropSettings.offsetY = parseInt(posYSlider.value);
                updateSliderValues();
                updateCropPreview();
            };

            zoomSlider.addEventListener('input', updateSettings);
            posXSlider.addEventListener('input', updateSettings);
            posYSlider.addEventListener('input', updateSettings);

            resetBtn.addEventListener('click', () => {
                cropSettings = { zoom: 1, offsetX: 0, offsetY: 0 };
                zoomSlider.value = 1;
                posXSlider.value = 0;
                posYSlider.value = 0;
                updateSliderValues();
                updateCropPreview();

                // Reset status
                document.getElementById('crop-status').textContent = 'Adjust the sliders to position your photo, then click Apply';
                document.getElementById('crop-status').classList.remove('applied');
                processedImageBlob = null;
            });

            applyBtn.addEventListener('click', async () => {
                if (originalImage) {
                    processedImageBlob = await generateProcessedImage();

                    // Update status
                    document.getElementById('crop-status').textContent = '✓ Photo adjustments applied and ready for card generation';
                    document.getElementById('crop-status').classList.add('applied');
                }
            });
        }

        // --- Form Submission with Processed Image ---
        form.addEventListener('submit', async (e) => {
            // Only intercept if we have a processed image
            if (processedImageBlob) {
                e.preventDefault();

                const formData = new FormData();
                formData.append('name', nameInput.value);
                formData.append('reg_no', regNoInput.value);
                formData.append('email', emailInput.value);
                formData.append('phone', phoneInput.value);
                formData.append('photo', processedImageBlob, 'processed_photo.png');

                // Disable form during submission
                submitBtn.disabled = true;
                submitBtn.textContent = 'Generating...';

                try {
                    const response = await fetch('/generate', {
                        method: 'POST',
                        body: formData
                    });

                    if (response.ok) {
                        // Get the response text (HTML) and replace current page
                        const html = await response.text();
                        document.open();
                        document.write(html);
                        document.close();
                    } else {
                        throw new Error('Failed to generate card');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('An error occurred while generating the card. Please try again.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Generate Card';
                }
            }
            // If no processed image, let the form submit normally
        });
    }

    // --- Card Export Logic (id_card.html) ---
    const downloadPngBtn = document.getElementById('download-png-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const printBtn = document.getElementById('print-btn');
    const exportArea = document.getElementById('card-export-area');

    if (downloadPngBtn && exportArea) {
        downloadPngBtn.addEventListener('click', () => {
            html2canvas(exportArea, { scale: 3, backgroundColor: null }).then(canvas => {
                const link = document.createElement('a');
                link.download = 'gfg-id-card.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        });
    }

    if (downloadPdfBtn && exportArea) {
        downloadPdfBtn.addEventListener('click', () => {
            html2canvas(exportArea, { scale: 3, backgroundColor: null }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a6' });
                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const ratio = imgProps.width / imgProps.height;
                let imgWidth = pdfWidth;
                let imgHeight = imgWidth / ratio;
                if (imgHeight > pdfHeight) {
                    imgHeight = pdfHeight;
                    imgWidth = imgHeight * ratio;
                }
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                pdf.save('gfg-id-card.pdf');
            });
        });
    }

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }
});
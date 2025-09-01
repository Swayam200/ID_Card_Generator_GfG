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

        // Live Photo Preview
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    photoPreview.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
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
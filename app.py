import os
import uuid
import io
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from PIL import Image, ImageDraw, ImageFont, ImageOps

# --- Configuration ---
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
MAX_CONTENT_LENGTH = 4 * 1024 * 1024

# QR Code Configuration
QR_CODE_SIZE = 200           # Size of QR code (200 = double the original 100)
QR_BASE_Y = 550             # Base Y position on card
QR_OFFSET_X = 0             # Left(-) / Right(+) adjustment
QR_OFFSET_Y = -50           # Up(-) / Down(+) adjustment

# --- App Initialization ---
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
app.config['SECRET_KEY'] = os.urandom(24)

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# --- Route to Serve Uploaded Images ---
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# --- Helper Functions ---
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def create_hexagonal_mask(size):
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    points = [
        (size[0] / 2, 0), (size[0], size[1] / 4), (size[0], size[1] * 3 / 4),
        (size[0] / 2, size[1]), (0, size[1] * 3 / 4), (0, size[1] / 4)
    ]
    draw.polygon(points, fill=255)
    return mask

def generate_qr_code(data, size=(120, 120)):
    """Generate QR code image from data"""
    import qrcode
    import io
    
    # Generate QR code using the simple method
    qr_img = qrcode.make(data, box_size=8, border=2)
    
    # Convert to bytes using BytesIO
    buffer = io.BytesIO()
    qr_img.save(buffer)  # No format parameter needed
    buffer.seek(0)
    
    # Load as PIL Image and process
    pil_image = Image.open(buffer)
    pil_image = pil_image.convert("RGBA")
    pil_image = pil_image.resize(size, Image.Resampling.LANCZOS)
    
    return pil_image

# --- Main Routes ---
@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_card():
    # --- Get ALL form data ---
    if 'photo' not in request.files:
        flash('No photo part in the request.')
        return redirect(request.url)
    
    file = request.files['photo']
    name = request.form.get('name', '').strip()
    reg_no = request.form.get('reg_no', '').strip()
    email = request.form.get('email', '').strip()
    phone = request.form.get('phone', '').strip()

    # --- Server-side validation for ALL fields ---
    if file.filename == '' or not all([name, reg_no, email, phone]):
        flash('All fields are required. Please fill out the entire form.')
        return redirect(url_for('index'))
    
    if file and allowed_file(file.filename):
        try:
            unique_id = uuid.uuid4().hex
            front_template = Image.open('static/id_card_design/front.png').convert("RGBA")
            back_template = Image.open('static/id_card_design/back.png').convert("RGBA")
            
            font_bold_path = os.path.join('static', 'fonts', 'Inter-Bold.ttf')
            font_regular_path = os.path.join('static', 'fonts', 'Inter-Regular.ttf')
            
            details_label_font = ImageFont.truetype(font_bold_path, size=28)
            details_value_font = ImageFont.truetype(font_regular_path, size=28)
            
            # --- [FIX] Using your proven font size for the back reg number ---
            back_reg_font = ImageFont.truetype(font_bold_path, size=32)

            # --- Process Photo ---
            user_photo = Image.open(file.stream).convert("RGBA")

            # Mobile Horizontal Image Invert Bug Fix
            try:
                transposed = ImageOps.exif_transpose(user_photo)
                if transposed is not None:
                    user_photo = transposed
            except Exception:
                pass
            photo_size = (285, 285)

            # Check if this is a pre-processed image (from frontend cropping)
            if file.filename == 'processed_photo.png':
                # Image is already cropped and hexagonal from frontend
                user_photo = user_photo.resize(photo_size, Image.Resampling.LANCZOS)
            else:
                # Apply server-side processing for non-processed images
                user_photo = ImageOps.fit(user_photo, photo_size, Image.Resampling.LANCZOS)
                mask = create_hexagonal_mask(photo_size)
                user_photo.putalpha(mask)

            draw_front = ImageDraw.Draw(front_template)
            photo_position = (158, 205) 
            front_template.paste(user_photo, photo_position, user_photo)

            # --- Draw Name (with Auto-Resizing Font) ---
            MAX_NAME_WIDTH, MAX_FONT_SIZE, MIN_FONT_SIZE = 450, 50, 28
            current_font_size = MAX_FONT_SIZE
            name_font = ImageFont.truetype(font_bold_path, size=current_font_size)
            while name_font.getbbox(name)[2] > MAX_NAME_WIDTH and current_font_size > MIN_FONT_SIZE:
                current_font_size -= 1
                name_font = ImageFont.truetype(font_bold_path, size=current_font_size)

            name_bbox = draw_front.textbbox((0, 0), name, font=name_font)
            name_width = name_bbox[2] - name_bbox[0]

            # Adjust vertical position based on font size - larger fonts go higher
            base_y = 585
            font_adjustment = (current_font_size - MIN_FONT_SIZE) * 0.5  # 0.5px up per font size increase
            adjusted_y = base_y - font_adjustment

            name_position = ((front_template.width - name_width) / 2, adjusted_y)
            draw_front.text(name_position, name, font=name_font, fill=(47, 141, 70, 255))

            # --- Draw Details Block ---
            label_x, value_x = 50, 190
            details_y_start, line_height = 740, 55
            
            draw_front.text((label_x, details_y_start), "Reg No", font=details_label_font, fill=(0,0,0,200))
            draw_front.text((value_x, details_y_start), reg_no, font=details_value_font, fill=(0,0,0,220))
            draw_front.text((label_x, details_y_start + (2 * line_height)), "Phone", font=details_label_font, fill=(0,0,0,200))
            draw_front.text((value_x, details_y_start + (2 * line_height)), phone, font=details_value_font, fill=(0,0,0,220))
            
            # Email (with Auto-Resizing Font)
            MAX_EMAIL_WIDTH, MAX_EMAIL_FONT, MIN_EMAIL_FONT = 375, 27, 18
            current_email_font_size = MAX_EMAIL_FONT
            email_font = ImageFont.truetype(font_regular_path, size=current_email_font_size)
            while email_font.getbbox(email)[2] > MAX_EMAIL_WIDTH and current_email_font_size > MIN_EMAIL_FONT:
                current_email_font_size -= 1
                email_font = ImageFont.truetype(font_regular_path, size=current_email_font_size)
            draw_front.text((label_x, details_y_start + line_height), "Email", font=details_label_font, fill=(0,0,0,200))
            draw_front.text((value_x, details_y_start + line_height), email, font=email_font, fill=(0,0,0,220))

            # --- [FIX] Using YOUR proven logic for the back image ---
            draw_back = ImageDraw.Draw(back_template)

            # --- Generate and add QR code ---
            verify_url = f"https://gfg-id-card-creator.onrender.com/verify?id={reg_no}&name={name.replace(' ', '+')}"

            # --- Generate QR code with configurable positioning ---
            qr_code = generate_qr_code(verify_url, size=(QR_CODE_SIZE, QR_CODE_SIZE))

            # Calculate position using configuration
            qr_x = ((back_template.width - QR_CODE_SIZE) // 2) + QR_OFFSET_X
            qr_y = QR_BASE_Y + QR_OFFSET_Y
            qr_position = (qr_x, qr_y)

            back_template.paste(qr_code, qr_position, qr_code)

            back_reg_bbox = draw_back.textbbox((0, 0), reg_no, font=back_reg_font)
            back_reg_width = back_reg_bbox[2] - back_reg_bbox[0]
            # Using your hardcoded Y-value of 783 which you aligned perfectly.
            back_reg_pos = ((back_template.width - back_reg_width) / 2, 783)
            draw_back.text(back_reg_pos, reg_no, font=back_reg_font, fill=(255, 255, 255, 255))
            # ---------------------------------------------------------

            # --- Save Final Images ---
            front_filename, back_filename = f"front_{unique_id}.png", f"back_{unique_id}.png"
            front_template.save(os.path.join(app.config['UPLOAD_FOLDER'], front_filename))
            back_template.save(os.path.join(app.config['UPLOAD_FOLDER'], back_filename))
            
            return render_template(
                'id_card.html',
                front_image=url_for('uploaded_file', filename=front_filename),
                back_image=url_for('uploaded_file', filename=back_filename)
            )

        except Exception as e:
            app.logger.error(f"Error during image processing: {e}")
            flash('An error occurred while generating the card. Please try again.')
            return redirect(url_for('index'))
    else:
        flash('Invalid file type.')
        return redirect(url_for('index'))

@app.route('/verify', methods=['GET'])
def verify_card():
    reg_no = request.args.get('id', '')
    name = request.args.get('name', '')
    
    if not reg_no:
        return render_template('verify.html', error="Invalid verification code"), 400
    
    # For now, we'll show basic info. Later you could add database lookup
    return render_template('verify.html', 
                         reg_no=reg_no, 
                         name=name.replace('+', ' '),
                         verified=True)

# Error handlers and main execution block
@app.errorhandler(413)
def request_entity_too_large(error):
    flash('File is too large. Maximum size is 4 MB.')
    return redirect(url_for('index')), 413
@app.route('/healthz', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"})
if __name__ == '__main__':
    app.run(debug=True)
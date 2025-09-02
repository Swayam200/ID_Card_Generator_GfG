# GFG Technical Team – ID Card Generator

A simple, production-ready Flask web application that allows users to generate a participation ID card by filling out a form. This project focuses on a clean user experience, robust server-side validation, and image processing to superimpose user data onto a pre-designed card template.

## Screenshots
![Initial Form Filling](project_screenshots/initial_form_filing.png)  

Initial Form Filling

![Final Created ID](project_screenshots/created_id.png)  

Final Generated ID Card  

![ID Verification](<project_screenshots/ID Card Verification.JPG>)

ID Card Verification  

## Features

-   **Simple Web Form**: Clean interface to input Name, Registration Number, and upload a photo.
-   **Live Preview**: Client-side validation with live feedback and photo preview.
-   **Image Superimposition**: Uses Python's Pillow library to dynamically place user details and photo onto base card templates (`front.png`, `back.png`).
-   **Hexagonal Photo Mask**: Applies a hexagonal crop to the user's photo to fit the design.
-   **Export Options**: Download the generated card as a high-resolution PNG, a PDF document, or print it directly.
-   **Print-Friendly**: Includes specific CSS to ensure the card prints to the standard ID size of 86x54mm.
-   **Secure & Robust**: Enforces file size and type limitations on both client and server.

## Tech Stack & Architecture

-   **Backend**: Python 3.10+, Flask 3.x
-   **Image Processing**: Pillow (PIL Fork)
-   **Frontend**: HTML5, Vanilla CSS (Flexbox/Grid), Vanilla JavaScript
-   **Export Libraries (CDN)**: `html2canvas`, `jspdf`
-   **Deployment Target**: Not decided yet

## Running Locally

Follow these steps to run the project on your local machine:

1. **Clone the repository**
   ```bash
   git clone https://github.com/Swayam200/ID_Card_Generator_GfG.git
   cd ID_Card_Generator_GfG/id_card_app
   ```

2. **Create a virtual environment (recommended)**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Flask app**
   ```bash
   python app.py
   ```

5. **Open in browser**
   Visit [http://localhost:5000](http://localhost:5000) in your browser.

---

- Uploaded images and generated cards will be saved in the `uploads/` folder.
- For development, make sure you have Python 3.10+ installed.
- If you encounter issues, check your Python and pip versions, and ensure all dependencies are installed.
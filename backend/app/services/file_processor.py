import base64
import io
from pdfminer.high_level import extract_text as extract_pdf_text
from docx import Document
from PIL import Image

def process_file_data(filename: str, file_type: str, base64_data: str) -> str:
    """Extract text from base64 encoded files."""
    try:
        # data:application/pdf;base64,...
        if "," in base64_data:
            header, base64_data = base64_data.split(",")
            
        file_bytes = base64.b64decode(base64_data)
        file_io = io.BytesIO(file_bytes)
        
        if file_type == "application/pdf":
            return extract_pdf_text(file_io)
            
        elif "word" in file_type or filename.endswith(".docx"):
            doc = Document(file_io)
            return "\n".join([para.text for para in doc.paragraphs])
            
        elif "text" in file_type or filename.endswith(".txt"):
            return file_bytes.decode("utf-8", errors="ignore")
            
        elif "image" in file_type:
            # For images, we can't extract text easily without OCR, 
            # but we can return image info if vision not working.
            img = Image.open(file_io)
            return f"[IMAGE INFO: {filename} ({img.format}, {img.size[0]}x{img.size[1]})]"
            
        return f"[FILE: {filename} - content binary/unsupported]"
        
    except Exception as e:
        return f"[ERROR PROCESSING FILE {filename}: {str(e)}]"

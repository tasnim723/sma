import io
from pdfminer.pdfparser import PDFParser
from pdfminer.pdfdocument import PDFDocument
from pdfminer.pdftypes import resolve1

def extract_pdf_links(pdf_bytes: bytes):
    links = []
    try:
        parser = PDFParser(io.BytesIO(pdf_bytes))
        doc = PDFDocument(parser)
        if 'Pages' in doc.catalog:
            pages = resolve1(doc.catalog['Pages'])
            if 'Kids' in pages:
                kids = resolve1(pages['Kids'])
                for page_ref in kids:
                    page = resolve1(page_ref)
                    if 'Annots' in page:
                        annots = resolve1(page['Annots'])
                        for annot_ref in annots:
                            annot = resolve1(annot_ref)
                            if 'A' in annot:
                                action = resolve1(annot['A'])
                                if 'URI' in action:
                                    uri = action['URI']
                                    if isinstance(uri, bytes):
                                        links.append(uri.decode('utf-8', 'ignore'))
                                    else:
                                        links.append(str(uri))
    except Exception as e:
        print(e)
    return links

print("PDF link extractor ready")

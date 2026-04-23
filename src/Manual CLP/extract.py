from pypdf import PdfReader

reader = PdfReader("Apostila_Curso_PLC_Siemens_Software_Step7.pdf")
text = ""
for page in reader.pages:
    text += page.extract_text() + "\n"

with open("manual.txt", "w", encoding="utf-8") as f:
    f.write(text)

# model/inference.py
from xmlrpc import client
import torch
from transformers import RobertaTokenizer
import numpy as np
from google import genai
import ast

class RobertaForVAD(torch.nn.Module):
    def __init__(self, model_name):
        super().__init__()
        from transformers import RobertaModel
        self.roberta = RobertaModel.from_pretrained(model_name)
        self.dropout = torch.nn.Dropout(0.1)
        self.regressor = torch.nn.Linear(self.roberta.config.hidden_size, 3)

    def forward(self, input_ids, attention_mask):
        outputs = self.roberta(input_ids=input_ids, attention_mask=attention_mask)
        pooled = outputs.pooler_output if hasattr(outputs, "pooler_output") else outputs.last_hidden_state[:, 0]
        x = self.dropout(pooled)
        return self.regressor(x)

# Load once
model = RobertaForVAD('roberta-base')
model.load_state_dict(torch.load('model/roberta_vad_regression.pt', map_location='cpu'))
model.eval()
tokenizer = RobertaTokenizer.from_pretrained('roberta-base')

def split_text(paragraph):
    client = genai.Client(api_key = "AIzaSyB6tYc1OUL0UDfP_1dWbUtku-u-0XnCe04")
    prompt = (
        "I am inputting a long paragraph and I want to split it into smaller chunks, each under 1000 characters.\n\n"
        "Please split based on natural semantic shifts — such as when the subject, person, emotion, or activity clearly changes. "
        "Be especially sensitive to transitions between:\n"
        "- Emotional states (e.g., anxious → sad → happy)\n"
        "- Actions or events (e.g., arriving → arguing → dancing)\n"
        "- People being discussed (e.g., from Allie to Henry)\n\n"
        "Do not combine unrelated thoughts or moments into the same chunk. When in doubt, make the chunk shorter.\n\n"
        "🔥 Important formatting rules:\n"
        "- Only return a raw Python list of strings\n"
        "- No markdown or code block syntax (no triple backticks or `python` tags)\n"
        "- Make sure the list is valid and parsable by ast.literal_eval()\n\n"
        "Here is the paragraph:\n"
        + paragraph
    )

    response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt
    )
    print(f"Response from model: {response.text}")

    # Safely parse the returned list string
    try:
        chunks = ast.literal_eval(response.text)
    except Exception as e:
        print("Error parsing response:", e)
        chunks = []

    # Optional: verify result
    print(f"Chunks: {chunks}")
    return chunks

def process_entry(text):
    """
    Splits entry into paragraphs, further chunks long paragraphs,
    returns dict of {chunk: [valence, arousal, dominance]}.
    """
    paragraphs = text.split("\n\n")
    results = {}

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        chunks = split_text(para)

        for chunk in chunks:
            inputs = tokenizer(chunk, return_tensors='pt', truncation=True, padding='max_length', max_length=128)
            with torch.no_grad():
                outputs = model(inputs['input_ids'], inputs['attention_mask'])
            vad = outputs[0].tolist()
            scaled_vad = [x * 2 - 1 for x in vad]
            results[chunk] = scaled_vad

    return results
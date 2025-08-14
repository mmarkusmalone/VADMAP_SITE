# VADMap – Emotional Mapping Journal

VADMap is an interactive web application for recording, analyzing, and visualizing journal entries based on their **Valence**, **Arousal**, and **Dominance** (VAD) emotional dimensions. It combines a rich 3D visualization (via [Three.js](https://threejs.org/)) with backend AI-powered sentiment analysis to help users reflect on their emotional journeys over time.

---
<img width="1340" height="755" alt="Screenshot 2025-08-14 at 1 47 47 PM" src="https://github.com/user-attachments/assets/c973542c-a265-4752-aea1-573c072344f6" />
<img width="748" height="417" alt="Screenshot 2025-08-14 at 1 48 37 PM" src="https://github.com/user-attachments/assets/cbbfa38e-cf65-4e1d-91e4-a81f4be5a59f" />
<img width="1174" height="524" alt="Screenshot 2025-08-14 at 1 49 29 PM" src="https://github.com/user-attachments/assets/dc3ce90e-c210-4e1d-983f-80b0d01c9bbf" />


## ✨ Features

- **Add Journal Entries** – Record text entries with date stamps.
- **AI-powered Emotion Analysis** – The backend uses a pre-trained model (loaded via `aloadmodel`) to assign VAD scores to each entry.
- **3D Emotional Map** – Visualize your entries in a 3D space based on their emotional dimensions.
- **Filtering & Search** – Filter by keywords, date range, and specific VAD score ranges.
- **Journal Viewing** – Browse and revisit past entries in a modal interface.
- **Interactive Legend** – See how low/high valence, arousal, and dominance map to your visualization.
- **Responsive UI** – Works on various screen sizes.

---

## 📂 Project Structure
```
├── index.html # Frontend HTML structure
├── src/
│ ├── style.css # Styling for the app
│ ├── source.js # Frontend logic (UI, events, Three.js visualization)
│ ├── counter.js # (If included) Additional UI scripts
├── backend/
│ ├── server.js # Node.js/Express backend for saving/loading entries
│ ├── aloadmodel.js # Loads sentiment analysis model for VAD scoring
├── assets/
│ ├── img/ # Legend images for low/high VAD values
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- **Frontend**: Any modern web browser (Chrome, Firefox, Edge, Safari)
- **Backend**:
  - Node.js (v16+ recommended)
  - npm or yarn
- **Optional**: GPU support for faster model inference (if using a large model)

### Installation

1. **Clone this repository**:
   ```bash
   git clone https://github.com/yourusername/vadmap.git
   cd VADMAP-site
2. **Create a Virtual Environment and download the dependencies is requirements.txt**
3. **Load the custom model:**
   Download mmarkusmalone/VAD_Journal_Finetuned from huggingface and save it into the repository
5. **Run the program**
   For the frontend server:
    ``` bash
   npx vite
   ```
  For the backend server:
   ``` bash
   npm run dev
   ```

## 🛠 How It Works

1. **User adds an entry** →  
   A modal form collects a date and text.

2. **Backend processes the entry** →  
   - The text is sent to the Node.js server.  
   - The `aloadmodel` script loads a sentiment/emotion model.  
   - The model computes **Valence**, **Arousal**, and **Dominance** scores.

3. **Entry is stored** →  
   Saved in the backend’s database or JSON file.

4. **3D Visualization updates** →  
   - The frontend (`source.js`) plots the entry as a point in 3D space.  
   - Points are color-coded and positioned based on their VAD values.

5. **Filtering & exploration** →  
   Users can search and filter entries to see emotional trends over time.

---

## 📸 UI Overview

### Top Left Controls
- **About VADMap** – Learn about the app  
- **Add New Entry** – Opens modal for new journal entry  
- **View Journal Entries** – List view of saved entries  
- **Filters** – Adjust keyword, date, and VAD ranges  

### Legend
- Shows the scale for **Valence**, **Arousal**, and **Dominance** with images and gradients.

### Modals
- **View Journal** – Scrollable list of past entries  
- **Entry Modal** – Text area for adding a new entry

## Sources
o	https://ieeexplore.ieee.org/abstract/document/10351354 
o	https://www.tandfonline.com/doi/abs/10.1080/10447318.2023.2286090 
o	https://dl.acm.org/doi/abs/10.1145/3706599.3719287 
o	https://dl.acm.org/doi/abs/10.1145/3421937.3421983 
o	https://www.annualreviews.org/content/journals/10.1146/annurev.psych.54.101601.145030 
o	https://orca.cardiff.ac.uk/id/eprint/136021/ 
o	https://www.researchgate.net/profile/Kavitha-Soppari/publication/391271264_EMO_Diary_Daily_Diary_with_Sentiment_Analysis/links/68109ac460241d51401fb9e7/EMO-Diary-Daily-Diary-with-Sentiment-Analysis.pdf 
o	https://www.medrxiv.org/content/10.1101/2025.01.17.25320717v1 
o	https://arxiv.org/abs/2503.10707 
o	https://bmjopen.bmj.com/content/8/7/e020600.abstract 
o	https://www.techrxiv.org/doi/full/10.36227/techrxiv.174495503.30847070 
o	https://www.researchgate.net/profile/Arya-Arya-3/publication/391015547_DEAR_DIARY_Mental_Health_Supervisor/links/68080ea3df0e3f544f456b1c/DEAR-DIARY-Mental-Health-Supervisor.pdf 
o	https://journals.sagepub.com/doi/full/10.1177/0038038515578993 
o	https://www.tandfonline.com/doi/abs/10.1080/08873267.2012.724255 


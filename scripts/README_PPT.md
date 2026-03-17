# HackNova 2026 – Deepfake Shield Presentation Generator

This folder contains a **Python script that builds the full 7-slide PowerPoint** following the **mandatory HackNova / Jondhale template** with charts, diagrams, and tables.

## Template compliance (mandatory)

The generated PPT strictly follows:

- **Slide 1**: Title – Hackathon header (12-Hour National-Level, Samarth Samaj's, SHIVAJIRAO S. JONDHALE COLLEGE OF ENGINEERING DOMBIVLI (E), Affiliated to University of Mumbai, CODE . CREATE . CONQUER) + **DEEPFAKE SHIELD** + subtitle + Team: The Sopranos  
- **Slide 2**: TECHNOVA CLUB – Team Leader + Members pre-filled (Team Leader: Abhishek Pal; Members: Umesh Patel, Harsh Patil, Prem Patil; Team Name: The Sopranos)  
- **Slide 3**: Proposed Solution – Problem (deepfake crisis), Solution (Deepfake Shield), Innovation  
- **Slide 4**: Technical Approach – Tech stack, Architecture diagram, Detection pipeline  
- **Slide 5**: Feasibility & Viability – Technical/Economic feasibility, Challenges & mitigation table, Market  
- **Slide 6**: Impact & Benefits – Social impact, Economic benefits, Metrics  
- **Slide 7**: Research & References – Academic/datasets, Competitor comparison table, Thank you  

## What the script adds

- **Charts**: Deepfake growth (bar 2020–2026), Accuracy comparison (bar), Market size growth (line), Market segments (pie), Impact metrics (bar).  
- **Diagrams**: System architecture (Frontend / API / ML + User / DB / Storage) as labeled boxes; Detection pipeline as a single line of steps.  
- **Tables**: Competitor comparison (Accuracy, Speed, Cost), Risk mitigation (Challenge vs Mitigation).  
- **Colors**: Blue (theme/tech), Green (solutions/feasibility), Red (threats/problem), consistent fonts and spacing.

## How to run

```bash
# From repo root or from deepfake-shield/
pip install -r scripts/requirements-ppt.txt
python scripts/build_presentation.py
```

Output: **`DeepfakeShield_Presentation.pptx`** in the current working directory (same folder as the script if you run from `scripts/`).

## After generating

1. Open `DeepfakeShield_Presentation.pptx` in PowerPoint.
2. **Fill in Slide 2** with real names (Team Leader, Members 1–3).
3. If you received an official **HackNova_PPT_Template.pptx** from the college, you can copy each generated slide into that template to match exact master/layout (fonts, logo, footer). The *content* and *structure* of these 7 slides follow the template; only the visual master may differ if you don’t have the official file.
4. Add a QR code or link for the demo on the Thank You slide if desired (manually in PowerPoint).

## Files

- `build_presentation.py` – Builds the 7-slide deck.  
- `requirements-ppt.txt` – `python-pptx` dependency.  
- `README_PPT.md` – This file.

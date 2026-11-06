# Vendor Risk Radar

## Problem Statement

Vendor risk data is often fragmented across multiple enterprise systems, including third-party assessments, CMDB inventories, firewall records, IT controls, and exception registers. This makes it difficult for organizations to identify, assess, and explain vendor risk effectively.

Vendor Risk Radar consolidates multiple risk data sources into a unified, explainable risk intelligence platform that provides risk scoring, evidence lineage, scenario analysis, and interactive visualizations.

---

## Prerequisites

- Python 3.10+
- Git
- Modern web browser (Chrome, Edge, Firefox)
- Local copy of the Vendor Risk Radar Excel dataset

---

## Clone Repository

```bash
git clone <repo-url>
cd vendor-risk-radar
```

---

## Install Dependencies

Create and activate a virtual environment:

```bash
python -m venv .venv
```

### Windows

```bash
.venv\Scripts\activate
```

### Mac/Linux

```bash
source .venv/bin/activate
```

Install required packages:

```bash
pip install -r backend/requirements.txt
```

---

## Configure

Place the following files inside the `data/` directory:

- Aravo.xlsx
- Aravo-IT_Risk_Overview.xlsx
- cmdb_ci_business_app.xlsx
- completed-IT-Controls.xlsx
- Exceptions.xlsx
- myIT-firewall.xlsx

No additional API keys are required for the prototype.

---

## Run Application

Navigate to the backend folder and start the application:

```bash
cd backend
python app.py
```

Open the URL displayed in the terminal, typically:

```text
http://localhost:5000
```

---

## Expected Functionality

The dashboard should allow users to:

- View Vendor Risk Radar visualization
- Compare vendor risk profiles
- Switch between Data Risk Focus and Network Risk Focus scenarios
- Review vendor risk scores and risk bands
- Drill into vendor-level details
- Analyze evidence lineage and risk drivers

---

## Sample Output

Example Output:

- Combined Risk Score: 4.34 / 5
- Risk Band: Critical
- Confidence Score: 95%
- Primary Risk Driver: Business Criticality
- Scenario: Network Risk Focus

Refer to the images in the `outputs/` folder for sample dashboard screenshots.

---

## Repository Structure

```text
backend/        Application backend
frontend/       Dashboard UI
data/           Source datasets
docs/           Architecture and demo documentation
evaluation/     Self-assessment artifacts
outputs/        Dashboard screenshots and sample outputs
scripts/        Utility scripts
```

---

## Demo

Refer to:

```text
docs/Demo_Runbook.md
docs/Demo_Video_Link.md
```

for the demonstration workflow and video.

---

## Known Limitations

- Prototype uses a limited sample dataset.
- Some vendor-application relationships are synthetic and created for demonstration purposes.
- Real-time system integrations are not implemented.
- Risk scoring uses configurable business rules and weighting models.

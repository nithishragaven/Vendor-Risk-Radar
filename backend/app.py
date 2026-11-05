from pathlib import Path
import math

import pandas as pd
from flask import Flask, jsonify, render_template


# =========================================================
# FLASK APPLICATION
# =========================================================

app = Flask(__name__)


# =========================================================
# FILE CONFIGURATION
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

EXCEL_FILE = (
    BASE_DIR
    / "data"
    / "Vendor_Risk_Radar_Optimized_Framework 6.xlsx"
)


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def clean_value(value):
    """
    Convert pandas / numpy values into JSON-safe values.
    """

    if pd.isna(value):
        return None

    if hasattr(value, "item"):
        value = value.item()

    if isinstance(value, float):
        if math.isnan(value):
            return None

    return value


def find_sheet(sheet_names, possible_names):
    """
    Find a worksheet while allowing small differences
    in spaces and capitalization.
    """

    normalized_sheets = {}

    for sheet_name in sheet_names:

        normalized_name = (
            str(sheet_name)
            .strip()
            .lower()
            .replace(" ", "_")
        )

        normalized_sheets[normalized_name] = sheet_name


    for possible_name in possible_names:

        normalized_possible_name = (
            possible_name
            .strip()
            .lower()
            .replace(" ", "_")
        )

        if normalized_possible_name in normalized_sheets:

            return normalized_sheets[
                normalized_possible_name
            ]

    return None


def remove_empty_rows(dataframe):
    """
    Remove completely empty rows from a dataframe.
    """

    if dataframe is None:
        return None

    dataframe = dataframe.dropna(
        how="all"
    )

    dataframe = dataframe.reset_index(
        drop=True
    )

    return dataframe


def read_workbook():
    """
    Load Vendor Risk Radar Excel sheets.

    Important:
    Row 1 = sheet title
    Row 2 = blank / formatting row
    Row 3 = actual column headers

    Therefore pandas uses header=2.
    """

    if not EXCEL_FILE.exists():

        raise FileNotFoundError(
            f"Excel workbook not found at: {EXCEL_FILE}"
        )


    excel = pd.ExcelFile(
        EXCEL_FILE,
        engine="openpyxl"
    )


    sheet_names = excel.sheet_names


    # =====================================================
    # FIND CONSOLIDATED RISK SHEET
    # =====================================================

    consolidated_sheet = find_sheet(
        sheet_names,
        [
            "Consolidated_Risk",
            "Consolidated Risk",
            "Consolidated",
            "Consolidated Data"
        ]
    )


    # =====================================================
    # FIND EVIDENCE LOG
    # =====================================================

    evidence_sheet = find_sheet(
        sheet_names,
        [
            "Evidence_Log",
            "Evidence Log",
            "Evidence",
            "Evidence Data"
        ]
    )


    # =====================================================
    # FIND ENTITY MAPPING
    # =====================================================

    mapping_sheet = find_sheet(
        sheet_names,
        [
            "Entity_Mapping",
            "Entity Mapping",
            "Mapping",
            "Vendor Mapping"
        ]
    )


    if consolidated_sheet is None:

        raise ValueError(
            "Could not locate the Consolidated Risk worksheet. "
            f"Available worksheets are: {sheet_names}"
        )


    # =====================================================
    # READ CONSOLIDATED DATA
    # =====================================================

    consolidated_df = pd.read_excel(
        EXCEL_FILE,
        sheet_name=consolidated_sheet,
        engine="openpyxl",
        header=2
    )


    consolidated_df = remove_empty_rows(
        consolidated_df
    )


    # =====================================================
    # READ EVIDENCE LOG
    # =====================================================

    evidence_df = None

    if evidence_sheet is not None:

        evidence_df = pd.read_excel(
            EXCEL_FILE,
            sheet_name=evidence_sheet,
            engine="openpyxl",
            header=2
        )

        evidence_df = remove_empty_rows(
            evidence_df
        )


    # =====================================================
    # READ ENTITY MAPPING
    # =====================================================

    mapping_df = None

    if mapping_sheet is not None:

        mapping_df = pd.read_excel(
            EXCEL_FILE,
            sheet_name=mapping_sheet,
            engine="openpyxl",
            header=2
        )

        mapping_df = remove_empty_rows(
            mapping_df
        )


    return {

        "sheet_names":
            sheet_names,

        "consolidated_sheet":
            consolidated_sheet,

        "evidence_sheet":
            evidence_sheet,

        "mapping_sheet":
            mapping_sheet,

        "consolidated":
            consolidated_df,

        "evidence":
            evidence_df,

        "mapping":
            mapping_df

    }


def dataframe_records(dataframe):
    """
    Convert pandas DataFrame into JSON-safe records.
    """

    if dataframe is None:
        return []


    dataframe = dataframe.copy()


    # Clean column headers

    dataframe.columns = [

        str(column).strip()

        for column in dataframe.columns

    ]


    records = []


    for _, row in dataframe.iterrows():

        record = {}


        for column in dataframe.columns:

            record[column] = clean_value(
                row[column]
            )


        records.append(record)


    return records


# =========================================================
# DASHBOARD PAGE
# =========================================================

@app.route("/")
def dashboard():

    return render_template(
        "index.html"
    )


# =========================================================
# VENDOR DETAIL PAGE
# =========================================================

@app.route("/vendor/<mapping_id>")
def vendor_detail(mapping_id):

    return render_template(
        "vendor_detail.html",
        mapping_id=mapping_id
    )


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/api/health")
def health():

    try:

        workbook = read_workbook()


        return jsonify({

            "status":
                "success",

            "message":
                "Vendor Risk Radar backend is running.",

            "workbook":
                EXCEL_FILE.name,

            "sheets":
                workbook["sheet_names"],

            "consolidated_sheet":
                workbook["consolidated_sheet"],

            "evidence_sheet":
                workbook["evidence_sheet"],

            "mapping_sheet":
                workbook["mapping_sheet"]

        })


    except Exception as error:

        return jsonify({

            "status":
                "error",

            "message":
                str(error)

        }), 500


# =========================================================
# COLUMN CHECK
# =========================================================

@app.route("/api/columns")
def columns():

    try:

        workbook = read_workbook()


        consolidated_columns = [

            str(column)

            for column in
            workbook["consolidated"].columns

        ]


        evidence_columns = []


        if workbook["evidence"] is not None:

            evidence_columns = [

                str(column)

                for column in
                workbook["evidence"].columns

            ]


        mapping_columns = []


        if workbook["mapping"] is not None:

            mapping_columns = [

                str(column)

                for column in
                workbook["mapping"].columns

            ]


        return jsonify({

            "status":
                "success",

            "consolidated_columns":
                consolidated_columns,

            "evidence_columns":
                evidence_columns,

            "mapping_columns":
                mapping_columns

        })


    except Exception as error:

        return jsonify({

            "status":
                "error",

            "message":
                str(error)

        }), 500


# =========================================================
# ALL VENDOR DATA
# =========================================================

@app.route("/api/vendors")
def vendors():

    try:

        workbook = read_workbook()


        vendor_records = dataframe_records(
            workbook["consolidated"]
        )


        return jsonify({

            "status":
                "success",

            "count":
                len(vendor_records),

            "vendors":
                vendor_records

        })


    except Exception as error:

        return jsonify({

            "status":
                "error",

            "message":
                str(error)

        }), 500


# =========================================================
# ALL EVIDENCE DATA
# =========================================================

@app.route("/api/evidence")
def evidence():

    try:

        workbook = read_workbook()


        evidence_records = dataframe_records(
            workbook["evidence"]
        )


        return jsonify({

            "status":
                "success",

            "count":
                len(evidence_records),

            "evidence":
                evidence_records

        })


    except Exception as error:

        return jsonify({

            "status":
                "error",

            "message":
                str(error)

        }), 500


# =========================================================
# ENTITY MAPPING DATA
# =========================================================

@app.route("/api/mappings")
def mappings():

    try:

        workbook = read_workbook()


        mapping_records = dataframe_records(
            workbook["mapping"]
        )


        return jsonify({

            "status":
                "success",

            "count":
                len(mapping_records),

            "mappings":
                mapping_records

        })


    except Exception as error:

        return jsonify({

            "status":
                "error",

            "message":
                str(error)

        }), 500


# =========================================================
# INDIVIDUAL VENDOR API
# =========================================================

@app.route("/api/vendor/<mapping_id>")
def vendor_api(mapping_id):

    try:

        workbook = read_workbook()


        vendor_records = dataframe_records(
            workbook["consolidated"]
        )


        evidence_records = dataframe_records(
            workbook["evidence"]
        )


        selected_vendor = None


        for record in vendor_records:

            record_mapping_id = str(
                record.get(
                    "Mapping ID",
                    ""
                )
            ).strip()


            if record_mapping_id == str(
                mapping_id
            ).strip():

                selected_vendor = record

                break


        if selected_vendor is None:

            return jsonify({

                "status":
                    "error",

                "message":
                    f"No vendor found for Mapping ID: {mapping_id}"

            }), 404


        vendor_evidence = []


        for record in evidence_records:

            record_mapping_id = str(
                record.get(
                    "Mapping ID",
                    ""
                )
            ).strip()


            if record_mapping_id == str(
                mapping_id
            ).strip():

                vendor_evidence.append(
                    record
                )


        return jsonify({

            "status":
                "success",

            "vendor":
                selected_vendor,

            "evidence":
                vendor_evidence

        })


    except Exception as error:

        return jsonify({

            "status":
                "error",

            "message":
                str(error)

        }), 500


# =========================================================
# DEBUG API
# =========================================================

@app.route("/api/debug")
def debug_data():

    try:

        workbook = read_workbook()


        vendor_records = dataframe_records(
            workbook["consolidated"]
        )


        evidence_records = dataframe_records(
            workbook["evidence"]
        )


        return jsonify({

            "status":
                "success",

            "vendor_row_count":
                len(vendor_records),

            "evidence_row_count":
                len(evidence_records),

            "first_vendor_record":
                vendor_records[0]
                if vendor_records
                else None,

            "first_evidence_record":
                evidence_records[0]
                if evidence_records
                else None

        })


    except Exception as error:

        return jsonify({

            "status":
                "error",

            "message":
                str(error)

        }), 500


# =========================================================
# ERROR HANDLERS
# =========================================================

@app.errorhandler(404)
def page_not_found(error):

    return jsonify({

        "status":
            "error",

        "message":
            "The requested page or API endpoint was not found."

    }), 404


@app.errorhandler(500)
def server_error(error):

    return jsonify({

        "status":
            "error",

        "message":
            "An internal server error occurred."

    }), 500


# =========================================================
# START FLASK
# =========================================================

if __name__ == "__main__":

    print("")
    print("============================================")
    print(" Vendor Risk Radar")
    print(" MSD / Merck Hackathon Prototype")
    print("============================================")
    print("")

    print(
        f"Workbook: {EXCEL_FILE}"
    )

    print("")

    print(
        "Dashboard:"
    )

    print(
        "http://127.0.0.1:5000"
    )

    print("")

    print(
        "Column diagnostic:"
    )

    print(
        "http://127.0.0.1:5000/api/columns"
    )

    print("")

    print(
        "Vendor API:"
    )

    print(
        "http://127.0.0.1:5000/api/vendors"
    )

    print("")

    print(
        "Debug API:"
    )

    print(
        "http://127.0.0.1:5000/api/debug"
    )

    print("")


    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
let detailChart = null;


const dimensionFields = [
    [
        "TP Assessment",
        "TP Assessment"
    ],
    [
        "Business Criticality",
        "Business Criticality"
    ],
    [
        "Data Exposure",
        "Data Exposure"
    ],
    [
        "Issues / Exceptions",
        "Issues / Exceptions"
    ],
    [
        "Network Exposure",
        "Network Exposure"
    ]
];


/* =====================================================
   DETAIL RADAR GRADIENT PLUGIN
===================================================== */

const detailRadarGradientPlugin = {

    id: "detailRadarGradient",

    beforeDatasetsDraw(chart) {

        const ctx =
            chart.ctx;


        const meta =
            chart
                .getDatasetMeta(
                    0
                );


        if (
            !meta ||
            !meta.data ||
            meta.data.length < 3
        ) {

            return;

        }


        const scale =
            chart.scales.r;


        if (!scale) {

            return;

        }


        const centerX =
            scale.xCenter;


        const centerY =
            scale.yCenter;


        const radius =
            scale.drawingArea;


        ctx.save();


        /*
           Vendor polygon
        */

        ctx.beginPath();


        meta.data.forEach(
            (
                point,
                index
            ) => {

                if (
                    index === 0
                ) {

                    ctx.moveTo(
                        point.x,
                        point.y
                    );

                }

                else {

                    ctx.lineTo(
                        point.x,
                        point.y
                    );

                }

            }
        );


        ctx.closePath();


        /*
           Clip colour to polygon
        */

        ctx.clip();


        /*
           Radial green -> amber -> red
        */

        const gradient =
            ctx.createRadialGradient(
                centerX,
                centerY,
                0,
                centerX,
                centerY,
                radius
            );


        gradient.addColorStop(
            0.00,
            "rgba(46,157,114,0.52)"
        );


        gradient.addColorStop(
            0.35,
            "rgba(98,181,116,0.50)"
        );


        gradient.addColorStop(
            0.52,
            "rgba(229,180,56,0.53)"
        );


        gradient.addColorStop(
            0.72,
            "rgba(230,126,34,0.56)"
        );


        gradient.addColorStop(
            1.00,
            "rgba(207,62,69,0.58)"
        );


        ctx.fillStyle =
            gradient;


        ctx.fillRect(
            centerX - radius,
            centerY - radius,
            radius * 2,
            radius * 2
        );


        ctx.restore();

    }

};


Chart.register(
    detailRadarGradientPlugin
);


/* =====================================================
   LOAD VENDOR
===================================================== */

async function loadVendorDetail() {

    try {

        const response =
            await fetch(

                `/api/vendor/${
                    encodeURIComponent(
                        window.MAPPING_ID
                    )
                }`

            );


        const data =
            await response.json();


        if (
            data.status !==
            "success"
        ) {

            throw new Error(
                data.message ||
                "Unable to load vendor."
            );

        }


        renderVendor(
            data.vendor
        );


        renderEvidence(
            data.evidence ||
            []
        );

    }

    catch (
        error
    ) {

        console.error(
            error
        );


        setElementText(
            "detailVendorName",
            "Unable to load vendor"
        );

    }

}


/* =====================================================
   HELPERS
===================================================== */

function safeValue(
    record,
    key,
    fallback = null
) {

    const result =
        record[key];


    if (
        result === undefined ||
        result === null ||
        result === ""
    ) {

        return fallback;

    }


    return result;

}


function setElementText(
    id,
    value
) {

    const element =
        document
            .getElementById(
                id
            );


    if (element) {

        element.textContent =
            value;

    }

}


function normalizeConfidence(
    value
) {

    const number =
        Number(
            value || 0
        );


    if (
        number > 1
    ) {

        return number / 100;

    }


    return number;

}


/* =====================================================
   RISK BAND
===================================================== */

function riskBand(
    score,
    vendor
) {

    const criticalMissing =
        Number(
            vendor[
                "Critical Missing Count"
            ] || 0
        );


    if (
        criticalMissing > 0
    ) {

        return "Review Required";

    }


    if (
        score >= 4.5
    ) {

        return "Critical";

    }


    if (
        score >= 3.75
    ) {

        return "Very High";

    }


    if (
        score >= 2.75
    ) {

        return "High";

    }


    if (
        score >= 1.75
    ) {

        return "Moderate";

    }


    return "Low";

}


function riskClass(
    band
) {

    const normalized =
        String(
            band
        )
        .toLowerCase();


    if (
        normalized.includes(
            "review"
        )
    ) {

        return "risk-review";

    }


    if (
        normalized.includes(
            "critical"
        )
        ||
        normalized.includes(
            "very high"
        )
    ) {

        return "risk-critical";

    }


    if (
        normalized.includes(
            "high"
        )
    ) {

        return "risk-high";

    }


    if (
        normalized.includes(
            "moderate"
        )
    ) {

        return "risk-moderate";

    }


    return "risk-low";

}


/* =====================================================
   SCORE COLOUR
===================================================== */

function riskScoreColor(
    score
) {

    const safeScore =
        Math.max(
            1,
            Math.min(
                5,
                Number(score) || 1
            )
        );


    const percentage =
        (
            safeScore -
            1
        )
        /
        4;


    let hue;


    if (
        percentage <=
        0.5
    ) {

        const firstHalf =
            percentage /
            0.5;


        hue =
            140 -
            (
                85 *
                firstHalf
            );

    }

    else {

        const secondHalf =
            (
                percentage -
                0.5
            )
            /
            0.5;


        hue =
            55 -
            (
                53 *
                secondHalf
            );

    }


    return (
        `hsl(${hue}, 72%, 45%)`
    );

}


/* =====================================================
   VALUES
===================================================== */

function getCombinedRisk(
    vendor
) {

    return Number(

        safeValue(
            vendor,
            "Combined Risk - Data",

            safeValue(
                vendor,
                "Combined Risk",
                0
            )
        )

    );

}


function getDimensions(
    vendor
) {

    return dimensionFields
        .map(
            item => ({

                label:
                    item[0],

                score:
                    Number(

                        safeValue(
                            vendor,
                            item[1],
                            0
                        )

                    )

            })
        );

}


function determineTopDriver(
    vendor
) {

    const dimensionValues =
        getDimensions(
            vendor
        );


    dimensionValues.sort(
        (a, b) =>
            b.score -
            a.score
    );


    return (
        dimensionValues.length
        ?
        dimensionValues[0]
            .label
        :
        "-"
    );

}


/* =====================================================
   VENDOR CONTENT
===================================================== */

function renderVendor(
    vendor
) {

    const vendorName =
        safeValue(
            vendor,
            "Vendor",
            "Unknown Vendor"
        );


    const application =
        safeValue(
            vendor,
            "Application",
            "-"
        );


    const combinedRisk =
        getCombinedRisk(
            vendor
        );


    const correlation =
        normalizeConfidence(

            safeValue(
                vendor,
                "Correlation Confidence",
                0
            )

        );


    const evidenceConfidence =
        normalizeConfidence(

            safeValue(
                vendor,
                "Confidence Score",
                0
            )

        );


    const topDriver =
        safeValue(
            vendor,
            "Key Driver",
            determineTopDriver(
                vendor
            )
        );


    setElementText(
        "detailVendorName",
        vendorName
    );


    setElementText(
        "detailApplication",
        application
    );


    setElementText(
        "detailApplicationTile",
        application
    );


    setElementText(
        "detailCombinedRisk",
        `${combinedRisk.toFixed(2)} / 5`
    );


    setElementText(
        "detailCorrelation",
        `${Math.round(
            correlation * 100
        )}%`
    );


    setElementText(
        "detailConfidence",
        `${Math.round(
            evidenceConfidence *
            100
        )}%`
    );


    setElementText(
        "detailDriver",
        topDriver
    );


    const tpAssessment =
        Number(

            safeValue(
                vendor,
                "TP Assessment",
                0
            )

        );


    const businessCriticality =
        Number(

            safeValue(
                vendor,
                "Business Criticality",
                0
            )

        );


    const dataExposure =
        Number(

            safeValue(
                vendor,
                "Data Exposure",
                0
            )

        );


    const issues =
        Number(

            safeValue(
                vendor,
                "Issues / Exceptions",
                0
            )

        );


    const networkExposure =
        Number(

            safeValue(
                vendor,
                "Network Exposure",
                0
            )

        );


    setElementText(
        "detailTPAssessment",
        tpAssessment.toFixed(1)
    );


    setElementText(
        "detailBusinessCriticality",
        businessCriticality.toFixed(1)
    );


    setElementText(
        "detailDataExposure",
        dataExposure.toFixed(1)
    );


    setElementText(
        "detailIssues",
        issues.toFixed(1)
    );


    setElementText(
        "detailNetworkExposure",
        networkExposure.toFixed(1)
    );


    const band =
        riskBand(
            combinedRisk,
            vendor
        );


    const bandElement =
        document
            .getElementById(
                "detailRiskBand"
            );


    bandElement.textContent =
        band;


    bandElement.className =
        `risk-badge ${
            riskClass(
                band
            )
        }`;


    renderRadar(
        vendor
    );


    renderDimensions(
        vendor
    );

}


/* =====================================================
   DETAIL RADAR
===================================================== */

function renderRadar(
    vendor
) {

    const labels =
        dimensionFields
            .map(
                item =>
                    item[0]
            );


    const values =
        dimensionFields
            .map(
                item =>
                    Number(

                        safeValue(
                            vendor,
                            item[1],
                            0
                        )

                    )
            );


    if (
        detailChart
    ) {

        detailChart.destroy();

    }


    const context =
        document
            .getElementById(
                "vendorDetailRadar"
            )
            .getContext(
                "2d"
            );


    detailChart =
        new Chart(
            context,
            {

                type:
                    "radar",


                data: {

                    labels:
                        labels,


                    datasets: [

                        {

                            label:
                                safeValue(
                                    vendor,
                                    "Vendor",
                                    "Vendor"
                                ),

                            data:
                                values,

                            backgroundColor:
                                "rgba(0,0,0,0)",

                            borderColor:
                                "#006b63",

                            pointBackgroundColor:
                                "#00857c",

                            pointBorderColor:
                                "#ffffff",

                            pointBorderWidth:
                                2,

                            pointRadius:
                                5,

                            pointHoverRadius:
                                7,

                            borderWidth:
                                3,

                            tension:
                                0.08

                        }

                    ]

                },


                options: {

                    devicePixelRatio:
                        Math.max(
                            window
                                .devicePixelRatio
                                || 1,
                            3
                        ),


                    responsive:
                        true,


                    maintainAspectRatio:
                        false,


                    animation: {

                        duration:
                            350

                    },


                    scales: {

                        r: {

                            min:
                                0,

                            max:
                                5,

                            beginAtZero:
                                true,


                            ticks: {

                                stepSize:
                                    1,

                                color:
                                    "#526A70",

                                backdropColor:
                                    "transparent",

                                showLabelBackdrop:
                                    false,

                                font: {

                                    size:
                                        12,

                                    weight:
                                        "600"

                                }

                            },


                            pointLabels: {

                                color:
                                    "#17324D",

                                padding:
                                    15,

                                font: {

                                    size:
                                        12,

                                    weight:
                                        "700"

                                }

                            },


                            grid: {

                                color:
                                    "rgba(79,111,113,0.20)",

                                lineWidth:
                                    1

                            },


                            angleLines: {

                                color:
                                    "rgba(79,111,113,0.23)",

                                lineWidth:
                                    1

                            }

                        }

                    },


                    plugins: {

                        legend: {

                            position:
                                "top",

                            labels: {

                                color:
                                    "#17324D",

                                usePointStyle:
                                    true,

                                padding:
                                    18,

                                font: {

                                    size:
                                        11,

                                    weight:
                                        "600"

                                }

                            }

                        },


                        tooltip: {

                            backgroundColor:
                                "#17324D",

                            titleColor:
                                "#FFFFFF",

                            bodyColor:
                                "#FFFFFF",

                            padding:
                                11,

                            displayColors:
                                false

                        }

                    }

                }

            }
        );

}


/* =====================================================
   DIMENSION BREAKDOWN
===================================================== */

function renderDimensions(
    vendor
) {

    const container =
        document
            .getElementById(
                "dimensionBreakdown"
            );


    container.innerHTML =
        "";


    getDimensions(
        vendor
    )
        .sort(
            (a, b) =>
                b.score -
                a.score
        )
        .forEach(
            dimension => {

                const div =
                    document
                        .createElement(
                            "div"
                        );


                div.className =
                    "risk-driver";


                const barColour =
                    riskScoreColor(
                        dimension.score
                    );


                const width =
                    Math.max(
                        0,
                        Math.min(
                            (
                                dimension.score /
                                5
                            ) * 100,
                            100
                        )
                    );


                div.innerHTML = `

                    <div
                        class="
                            driver-heading-row
                        "
                    >

                        <div
                            class="
                                driver-title
                            "
                        >

                            ${dimension.label}

                        </div>


                        <div
                            class="
                                driver-value
                            "

                            style="
                                color:
                                ${barColour};
                            "
                        >

                            ${dimension.score.toFixed(1)}

                        </div>

                    </div>


                    <div
                        class="
                            risk-progress
                        "
                    >

                        <span
                            style="
                                width:
                                ${width}%;

                                background:
                                ${barColour};
                            "
                        >
                        </span>

                    </div>


                    <div
                        class="
                            driver-score
                        "
                    >

                        Risk score:
                        ${dimension.score.toFixed(1)}
                        / 5

                    </div>

                `;


                container
                    .appendChild(
                        div
                    );

            }
        );

}


/* =====================================================
   EVIDENCE
===================================================== */

function renderEvidence(
    evidence
) {

    const body =
        document
            .getElementById(
                "evidenceTableBody"
            );


    body.innerHTML =
        "";


    if (
        !evidence.length
    ) {

        body.innerHTML = `

            <tr>

                <td
                    colspan="5"
                >

                    No linked evidence records found.

                </td>

            </tr>

        `;


        return;

    }


    evidence.forEach(
        record => {

            const row =
                document
                    .createElement(
                        "tr"
                    );


            row.innerHTML = `

                <td>

                    ${escapeHtml(
                        record[
                            "Source"
                        ] || "-"
                    )}

                </td>


                <td>

                    ${escapeHtml(
                        record[
                            "Dimension"
                        ] || "-"
                    )}

                </td>


                <td>

                    ${escapeHtml(
                        record[
                            "Raw Evidence"
                        ] || "-"
                    )}

                </td>


                <td>

                    ${
                        record[
                            "Normalized Score"
                        ]
                        ??
                        "-"
                    }

                </td>


                <td>

                    ${escapeHtml(

                        formatDate(
                            record[
                                "Evidence Date"
                            ]
                        )

                    )}

                </td>

            `;


            body.appendChild(
                row
            );

        }
    );

}


/* =====================================================
   DATE
===================================================== */

function formatDate(
    value
) {

    if (!value) {

        return "-";

    }


    return String(
        value
    )
    .replace(
        "T00:00:00",
        ""
    )
    .replace(
        " 00:00:00",
        ""
    );

}


/* =====================================================
   HTML SAFETY
===================================================== */

function escapeHtml(
    value
) {

    const div =
        document
            .createElement(
                "div"
            );


    div.textContent =
        String(
            value
        );


    return div.innerHTML;

}


/* =====================================================
   START
===================================================== */

loadVendorDetail();

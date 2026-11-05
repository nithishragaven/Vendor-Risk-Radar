let vendors = [];
let selectedVendor = null;
let activeScenario = "data";
let radarChart = null;


const dimensions = [
    "TP Assessment",
    "Business Criticality",
    "Data Exposure",
    "Issues / Exceptions",
    "Network Exposure"
];


/* =====================================================
   VENDOR RADAR GRADIENT PLUGIN

   Creates:
   Center    = Green
   Mid-risk  = Yellow / Amber
   Outer     = Red

   IMPORTANT:
   The gradient is clipped to the selected vendor polygon.
   It does NOT colour the full radar chart.
===================================================== */

const vendorRadarGradientPlugin = {

    id: "vendorRadarGradient",

    beforeDatasetsDraw(chart) {

        const ctx = chart.ctx;

        const datasetIndex = 0;

        const meta = chart.getDatasetMeta(
            datasetIndex
        );

        if (
            !meta ||
            !meta.data ||
            meta.data.length < 3
        ) {
            return;
        }


        const scale = chart.scales.r;

        if (!scale) {
            return;
        }


        const centerX = scale.xCenter;
        const centerY = scale.yCenter;
        const radius = scale.drawingArea;


        /*
           Build vendor polygon path
        */

        ctx.save();

        ctx.beginPath();

        meta.data.forEach(
            (point, index) => {

                if (index === 0) {

                    ctx.moveTo(
                        point.x,
                        point.y
                    );

                } else {

                    ctx.lineTo(
                        point.x,
                        point.y
                    );

                }

            }
        );

        ctx.closePath();

        /*
           Clip everything that follows
           to vendor-specific polygon.
        */

        ctx.clip();


        /*
           Risk colour gradient

           0 / 5 = green
           ~2.5 / 5 = amber
           5 / 5 = red

           Stops are positioned by radial
           distance from the centre.
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
            "rgba(46, 157, 114, 0.52)"
        );


        gradient.addColorStop(
            0.35,
            "rgba(98, 181, 116, 0.50)"
        );


        gradient.addColorStop(
            0.52,
            "rgba(229, 180, 56, 0.53)"
        );


        gradient.addColorStop(
            0.72,
            "rgba(230, 126, 34, 0.56)"
        );


        gradient.addColorStop(
            1.00,
            "rgba(207, 62, 69, 0.58)"
        );


        ctx.fillStyle = gradient;

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
    vendorRadarGradientPlugin
);


/* =====================================================
   LOAD DATA
===================================================== */

async function loadDashboard() {

    try {

        const response =
            await fetch(
                "/api/vendors"
            );


        const payload =
            await response.json();


        if (
            payload.status !== "success"
        ) {

            throw new Error(
                payload.message ||
                "Unable to load vendor data."
            );

        }


        vendors =
            payload.vendors || [];


        if (!vendors.length) {

            showError(
                "No vendor rows were found."
            );

            return;

        }


        selectedVendor =
            getRankedVendors()[0];


        renderDashboard();

    }

    catch (error) {

        console.error(
            error
        );


        showError(
            error.message
        );

    }

}


/* =====================================================
   VALUE HELPERS
===================================================== */

function getValue(
    record,
    candidates,
    fallback = null
) {

    for (
        const key
        of candidates
    ) {

        const value =
            record[key];


        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            return value;

        }

    }


    return fallback;

}


function normalizeConfidence(
    value
) {

    const number =
        Number(
            value || 0
        );


    if (number > 1) {

        return number / 100;

    }


    return number;

}


/* =====================================================
   SCENARIO SCORE
===================================================== */

function getScenarioScore(
    vendor
) {

    if (
        activeScenario ===
        "network"
    ) {

        return Number(

            getValue(
                vendor,
                [
                    "Combined Risk - Network",
                    "Combined Risk Network",
                    "Network Risk"
                ],
                0
            )

        );

    }


    return Number(

        getValue(
            vendor,
            [
                "Combined Risk - Data",
                "Combined Risk Data",
                "Combined Risk",
                "Risk Score"
            ],
            0
        )

    );

}


/* =====================================================
   RISK BAND
===================================================== */

function getRiskBand(
    score,
    vendor
) {

    const missing =
        Number(

            getValue(
                vendor,
                [
                    "Critical Missing Count"
                ],
                0
            )

        );


    if (missing > 0) {

        return "Review Required";

    }


    if (score >= 4.5) {

        return "Critical";

    }


    if (score >= 3.75) {

        return "Very High";

    }


    if (score >= 2.75) {

        return "High";

    }


    if (score >= 1.75) {

        return "Moderate";

    }


    return "Low";

}


/* =====================================================
   DIMENSION VALUES
===================================================== */

function getVendorDimensions(
    vendor
) {

    return [

        Number(
            getValue(
                vendor,
                [
                    "TP Assessment",
                    "Third-party assessment",
                    "Third Party Assessment"
                ],
                0
            )
        ),


        Number(
            getValue(
                vendor,
                [
                    "Business Criticality"
                ],
                0
            )
        ),


        Number(
            getValue(
                vendor,
                [
                    "Data Exposure"
                ],
                0
            )
        ),


        Number(
            getValue(
                vendor,
                [
                    "Issues / Exceptions",
                    "Issues / exceptions"
                ],
                0
            )
        ),


        Number(
            getValue(
                vendor,
                [
                    "Network Exposure"
                ],
                0
            )
        )

    ];

}


/* =====================================================
   PORTFOLIO AVERAGE
===================================================== */

function getPortfolioAverage() {

    return dimensions.map(
        (_, index) => {

            const values =
                vendors
                    .map(
                        vendor =>
                            getVendorDimensions(
                                vendor
                            )[index]
                    )
                    .filter(
                        value =>
                            Number.isFinite(
                                value
                            )
                    );


            if (
                !values.length
            ) {

                return 0;

            }


            const total =
                values.reduce(
                    (
                        sum,
                        value
                    ) =>
                        sum + value,
                    0
                );


            return (
                total /
                values.length
            );

        }
    );

}


/* =====================================================
   RANKING
===================================================== */

function getRankedVendors() {

    return [...vendors]
        .sort(
            (a, b) =>
                getScenarioScore(b) -
                getScenarioScore(a)
        );

}


/* =====================================================
   MAIN RENDER
===================================================== */

function renderDashboard() {

    if (!selectedVendor) {

        return;

    }


    renderKPIs();

    renderRadar();

    renderVendorSummary();

    renderRiskDrivers();

    renderTable(
        document
            .getElementById(
                "vendorSearch"
            )
            .value
    );

}


/* =====================================================
   KPIs
===================================================== */

function renderKPIs() {

    const ranked =
        getRankedVendors();


    document
        .getElementById(
            "vendorCount"
        )
        .textContent =
            vendors.length;


    const criticalCount =
        vendors.filter(
            vendor => {

                const band =
                    getRiskBand(
                        getScenarioScore(
                            vendor
                        ),
                        vendor
                    );


                return (
                    band ===
                        "Critical" ||
                    band ===
                        "Very High"
                );

            }
        ).length;


    document
        .getElementById(
            "criticalCount"
        )
        .textContent =
            criticalCount;


    const reviewCount =
        vendors.filter(
            vendor =>

                getRiskBand(
                    getScenarioScore(
                        vendor
                    ),
                    vendor
                )
                ===
                "Review Required"

        ).length;


    document
        .getElementById(
            "reviewCount"
        )
        .textContent =
            reviewCount;


    const topVendor =
        ranked[0];


    document
        .getElementById(
            "highestRiskVendor"
        )
        .textContent =
            getValue(
                topVendor,
                ["Vendor"],
                "Unknown"
            );


    document
        .getElementById(
            "highestRiskScore"
        )
        .textContent =
            `${getScenarioScore(
                topVendor
            ).toFixed(2)} / 5`;


    const confidenceValues =
        vendors
            .map(
                vendor =>
                    normalizeConfidence(

                        getValue(
                            vendor,
                            [
                                "Confidence Score"
                            ],
                            0
                        )

                    )
            )
            .filter(
                value =>
                    Number.isFinite(
                        value
                    )
            );


    const average =
        confidenceValues.reduce(
            (
                sum,
                value
            ) =>
                sum + value,
            0
        )
        /
        Math.max(
            confidenceValues.length,
            1
        );


    document
        .getElementById(
            "averageConfidence"
        )
        .textContent =
            `${Math.round(
                average * 100
            )}%`;

}


/* =====================================================
   RADAR
===================================================== */

function renderRadar() {

    const vendorValues =
        getVendorDimensions(
            selectedVendor
        );


    const portfolioValues =
        getPortfolioAverage();


    const vendorName =
        getValue(
            selectedVendor,
            ["Vendor"],
            "Selected Vendor"
        );


    document
        .getElementById(
            "radarTitle"
        )
        .textContent =
            `Risk Radar | ${vendorName}`;


    if (radarChart) {

        radarChart.destroy();

    }


    const canvas =
        document
            .getElementById(
                "riskRadar"
            );


    const context =
        canvas.getContext(
            "2d"
        );


    radarChart =
        new Chart(
            context,
            {

                type:
                    "radar",


                data: {

                    labels:
                        dimensions,


                    datasets: [

                        {

                            label:
                                vendorName,

                            data:
                                vendorValues,

                            /*
                               Transparent here because
                               custom plugin provides
                               polygon gradient fill.
                            */

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

                        },


                        {

                            label:
                                "Portfolio Average",

                            data:
                                portfolioValues,

                            borderColor:
                                "#809699",

                            backgroundColor:
                                "rgba(128,150,153,0.025)",

                            pointBackgroundColor:
                                "#809699",

                            pointBorderColor:
                                "#ffffff",

                            pointBorderWidth:
                                1,

                            pointRadius:
                                4,

                            pointHoverRadius:
                                6,

                            borderDash:
                                [7, 5],

                            borderWidth:
                                2,

                            tension:
                                0.08

                        }

                    ]

                },


                options: {

                    devicePixelRatio:
                        Math.max(
                            window.devicePixelRatio
                                || 1,
                            3
                        ),


                    responsive:
                        true,


                    maintainAspectRatio:
                        false,


                    resizeDelay:
                        0,


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
                                "bottom",

                            labels: {

                                color:
                                    "#17324D",

                                usePointStyle:
                                    true,

                                padding:
                                    20,

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
                                false,


                            callbacks: {

                                label:
                                    function(
                                        context
                                    ) {

                                        return (
                                            `${context.dataset.label}: ` +
                                            `${Number(
                                                context.raw
                                            ).toFixed(1)} / 5`
                                        );

                                    }

                            }

                        }

                    }

                }

            }
        );

}


/* =====================================================
   VENDOR SUMMARY
===================================================== */

function renderVendorSummary() {

    const vendorName =
        getValue(
            selectedVendor,
            ["Vendor"],
            "Unknown Vendor"
        );


    const application =
        getValue(
            selectedVendor,
            ["Application"],
            "-"
        );


    const score =
        getScenarioScore(
            selectedVendor
        );


    const band =
        getRiskBand(
            score,
            selectedVendor
        );


    const correlation =
        normalizeConfidence(

            getValue(
                selectedVendor,
                [
                    "Correlation Confidence"
                ],
                0
            )

        );


    const evidenceConfidence =
        normalizeConfidence(

            getValue(
                selectedVendor,
                [
                    "Confidence Score"
                ],
                0
            )

        );


    const driver =
        getValue(
            selectedVendor,
            ["Key Driver"],
            determineTopDriver(
                selectedVendor
            )
        );


    document
        .getElementById(
            "selectedVendorName"
        )
        .textContent =
            vendorName;


    document
        .getElementById(
            "selectedApplication"
        )
        .textContent =
            application;


    document
        .getElementById(
            "selectedRiskScore"
        )
        .textContent =
            score.toFixed(2);


    document
        .getElementById(
            "selectedCorrelation"
        )
        .textContent =
            `${Math.round(
                correlation * 100
            )}%`;


    document
        .getElementById(
            "selectedEvidenceConfidence"
        )
        .textContent =
            `${Math.round(
                evidenceConfidence * 100
            )}%`;


    document
        .getElementById(
            "selectedDriver"
        )
        .textContent =
            driver;


    const badge =
        document
            .getElementById(
                "selectedRiskBand"
            );


    badge.textContent =
        band;


    badge.className =
        `risk-badge ${riskClass(
            band
        )}`;


    const mappingId =
        getValue(
            selectedVendor,
            ["Mapping ID"],
            ""
        );


    document
        .getElementById(
            "vendorDetailButton"
        )
        .href =
            `/vendor/${
                encodeURIComponent(
                    mappingId
                )
            }`;

}


/* =====================================================
   TOP DRIVER
===================================================== */

function determineTopDriver(
    vendor
) {

    const scores =
        getVendorDimensions(
            vendor
        );


    const maximum =
        Math.max(
            ...scores
        );


    return dimensions[
        scores.indexOf(
            maximum
        )
    ];

}


/* =====================================================
   SCORE COLOUR

   1.0 = Green
   ~3.0 = Amber
   5.0 = Red

   Uses HSL interpolation for smooth
   continuous colour instead of hard bands.
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
        (safeScore - 1)
        /
        4;


    /*
       HSL Hue
       Green ~140
       Yellow ~55
       Red ~2
    */

    let hue;


    if (
        percentage <= 0.5
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
   KEY RISK DRIVERS
===================================================== */

function renderRiskDrivers() {

    const container =
        document
            .getElementById(
                "riskDrivers"
            );


    container.innerHTML =
        "";


    const scores =
        getVendorDimensions(
            selectedVendor
        );


    dimensions
        .map(
            (
                name,
                index
            ) => ({

                name:
                    name,

                score:
                    scores[index]

            })
        )
        .sort(
            (a, b) =>
                b.score -
                a.score
        )
        .forEach(
            driver => {

                const element =
                    document
                        .createElement(
                            "div"
                        );


                element.className =
                    "risk-driver";


                const barColor =
                    riskScoreColor(
                        driver.score
                    );


                const width =
                    Math.max(
                        0,
                        Math.min(
                            (
                                driver.score /
                                5
                            ) * 100,
                            100
                        )
                    );


                element.innerHTML = `

                    <div
                        class="driver-heading-row"
                    >

                        <div
                            class="driver-title"
                        >
                            ${escapeHtml(
                                driver.name
                            )}
                        </div>

                        <div
                            class="driver-value"
                            style="
                                color:
                                ${barColor};
                            "
                        >
                            ${driver.score.toFixed(1)}
                        </div>

                    </div>


                    <div
                        class="risk-progress"
                    >

                        <span
                            style="
                                width:
                                ${width}%;

                                background:
                                ${barColor};
                            "
                        >
                        </span>

                    </div>


                    <div
                        class="driver-score"
                    >
                        Risk contribution score:
                        ${driver.score.toFixed(1)}
                        / 5
                    </div>

                `;


                container
                    .appendChild(
                        element
                    );

            }
        );

}


/* =====================================================
   TABLE
===================================================== */

function renderTable(
    filter = ""
) {

    const body =
        document
            .getElementById(
                "vendorTableBody"
            );


    body.innerHTML =
        "";


    const searchText =
        String(
            filter || ""
        )
        .toLowerCase();


    getRankedVendors()
        .filter(
            vendor => {

                const vendorName =
                    String(

                        getValue(
                            vendor,
                            ["Vendor"],
                            ""
                        )

                    )
                    .toLowerCase();


                const application =
                    String(

                        getValue(
                            vendor,
                            ["Application"],
                            ""
                        )

                    )
                    .toLowerCase();


                return (
                    vendorName.includes(
                        searchText
                    )
                    ||
                    application.includes(
                        searchText
                    )
                );

            }
        )
        .forEach(
            (
                vendor,
                index
            ) => {

                const score =
                    getScenarioScore(
                        vendor
                    );


                const band =
                    getRiskBand(
                        score,
                        vendor
                    );


                const confidence =
                    normalizeConfidence(

                        getValue(
                            vendor,
                            [
                                "Confidence Score"
                            ],
                            0
                        )

                    );


                const mappingId =
                    getValue(
                        vendor,
                        ["Mapping ID"],
                        ""
                    );


                const row =
                    document
                        .createElement(
                            "tr"
                        );


                row.innerHTML = `

                    <td>
                        ${index + 1}
                    </td>


                    <td>

                        <strong>

                            ${escapeHtml(

                                getValue(
                                    vendor,
                                    ["Vendor"],
                                    "-"
                                )

                            )}

                        </strong>

                    </td>


                    <td>

                        ${escapeHtml(

                            getValue(
                                vendor,
                                ["Application"],
                                "-"
                            )

                        )}

                    </td>


                    <td>

                        <strong>
                            ${score.toFixed(2)}
                        </strong>

                        / 5

                    </td>


                    <td>

                        <span
                            class="
                                risk-badge
                                ${riskClass(
                                    band
                                )}
                            "
                        >

                            ${band}

                        </span>

                    </td>


                    <td>

                        ${Math.round(
                            confidence *
                            100
                        )}%

                    </td>


                    <td>

                        ${escapeHtml(

                            getValue(
                                vendor,
                                ["Key Driver"],
                                determineTopDriver(
                                    vendor
                                )
                            )

                        )}

                    </td>


                    <td>

                        <a
                            class="
                                table-detail-link
                            "

                            href="
                                /vendor/${
                                    encodeURIComponent(
                                        mappingId
                                    )
                                }
                            "
                        >

                            View Details

                        </a>

                    </td>

                `;


                row.addEventListener(
                    "click",
                    event => {

                        if (
                            event
                                .target
                                .closest(
                                    ".table-detail-link"
                                )
                        ) {

                            return;

                        }


                        selectedVendor =
                            vendor;


                        renderDashboard();


                        window.scrollTo({

                            top:
                                0,

                            behavior:
                                "smooth"

                        });

                    }
                );


                body.appendChild(
                    row
                );

            }
        );

}


/* =====================================================
   BADGE COLOUR
===================================================== */

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
   ERROR
===================================================== */

function showError(
    message
) {

    const errorBox =
        document
            .createElement(
                "div"
            );


    errorBox.className =
        "dashboard-error";


    errorBox.textContent =
        `Dashboard error: ${message}`;


    document.body
        .appendChild(
            errorBox
        );

}


/* =====================================================
   SCENARIO SWITCH

   Functionality unchanged.
===================================================== */

document
    .querySelectorAll(
        ".scenario-button"
    )
    .forEach(
        button => {

            button
                .addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".scenario-button"
                            )
                            .forEach(
                                item =>
                                    item
                                        .classList
                                        .remove(
                                            "active"
                                        )
                            );


                        button
                            .classList
                            .add(
                                "active"
                            );


                        activeScenario =
                            button
                                .dataset
                                .scenario;


                        const ranked =
                            getRankedVendors();


                        if (
                            ranked.length
                        ) {

                            selectedVendor =
                                ranked[0];

                        }


                        renderDashboard();

                    }
                );

        }
    );


/* =====================================================
   SEARCH
===================================================== */

document
    .getElementById(
        "vendorSearch"
    )
    .addEventListener(
        "input",
        event => {

            renderTable(
                event.target.value
            );

        }
    );


/* =====================================================
   START
===================================================== */

loadDashboard();

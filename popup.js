// to retrieve extension version from manifest
function updateVersion() {
    const manifest = chrome.runtime.getManifest();
    const version = manifest.version;
    document.getElementById('manifestVersion').textContent = version;
}

// Function to load users from the CSV file
async function loadUsers() {
    const response = await fetch(chrome.runtime.getURL('users.csv'));
    const csvData = await response.text();
    return parseCSV(csvData);
}

// Function to parse CSV data
function parseCSV(csv) {
    debugger;
    const rows = csv.split('\n').slice(1); // Skip the header row
    return rows.map(row => {
        const [firstName, lastName, contact] = row.split(',').map(cell => cell.trim());
        return { firstName, lastName, contact };
    }).filter(user => user.firstName && user.contact); // Filter out empty rows
}

// Populate the dropdown menu with users from the CSV file
async function populateUserSelector() {
    const users = await loadUsers();
    const userSelector = document.getElementById("userSelector");

    // Add a default empty option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select a user";
    defaultOption.disabled = true;
    defaultOption.selected = true; // Ensure it's selected by default
    userSelector.appendChild(defaultOption);

    // Populate the rest of the options
    users.forEach((user, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `${user.firstName} ${user.lastName}`;
        userSelector.appendChild(option);
    });

    // Set up event listener to autofill fields when a user is selected
    userSelector.addEventListener("change", () => {
        const selectedIndex = userSelector.value;
        const user = users[selectedIndex];
        if (user) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: autofillFieldsWithEvents,
                    args: [user]
                });
            });
        }
    });
}



// Function to autofill fields on the page using event-driven approach
function autofillFieldsWithEvents(user) {

    // Helper to set field value and trigger events
    function setField(selector, value) {
        const field = document.querySelector(selector);
        if (field) {
            field.value = value;
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`Set field ${selector} to ${value}`);
        } else {
            console.warn(`Field not found: ${selector}`);
        }
    }

    // Function to transform email addresses based on role
    function transformEmail(mail, role, new_domain) {
        const [localPart, currentDomain] = mail.split('@');

        if (!localPart || !new_domain) {
            throw new Error('Invalid email or new domain');
        }
        return `${localPart}.${role}@${new_domain}`;;
    }

    // Listen for changes in "Type of invite" to enable dependent fields
    const isTenant = document.querySelector('span.font-medium').textContent.match('Tenant Admin');
    const isPi = document.querySelector('span.font-medium').textContent.match('Pi');
    const isAnalyst = document.querySelector('span.font-medium').textContent.match('Analyst');
    const isOrgAdmin = document.querySelector('span.font-medium').textContent.match('Org Admin');
    const isSstm = document.querySelector('span.font-medium').textContent.match('Sstm');
    const isGstm = document.querySelector('span.font-medium').textContent.match('Gstm');
    const isCra = document.querySelector('span.font-medium').textContent.match('Cra');
    const isPractitioner = document.querySelector('span.font-medium').textContent.match('Practitioner');
    const isInvestigator = document.querySelector('span.font-medium').textContent.match('Investigator');
    const isStudyAssistant = document.querySelector('span.font-medium').textContent.match('Study Asst');


    console.log("isSstm", isSstm);
    const typeInviteField = document.querySelector('select[placeholder="Type of invite"]');
    if (typeInviteField) {
        typeInviteField.addEventListener('change', () => {
            console.log("Type of invite changed, setting dependent fields...");
            setField('select[placeholder="Provider *"]', "0: userpod.idp.cognito.pingid");
            setField('select[placeholder="Country *"]', "233: GB");
            setField('select[placeholder="Type *"]', "2: EMAIL");
            setField('input[placeholder="First name *"]', user.firstName);
            setField('input[placeholder="Last name"]', user.lastName);
            setField('input[placeholder="Contact information *"]',
                isTenant ? user.contact :
                    (
                        isPi ? transformEmail(user.contact, "pi", "az.msdc.co") :
                            (
                                isAnalyst ? transformEmail(user.contact, "analyst", "az.msdc.co") :
                                    (
                                        isOrgAdmin ? transformEmail(user.contact, "org-admin", "az.msdc.co") :
                                            (
                                                isSstm ? transformEmail(user.contact, "sstm", "az.msdc.co") :
                                                    (
                                                        isGstm ? transformEmail(user.contact, "gstm", "az.msdc.co") :
                                                        (
                                                                isCra ? transformEmail(user.contact, "cra", "az.msdc.co") :
                                                                    (
                                                                        isPractitioner ? transformEmail(user.contact, "practitioner", "az.msdc.co") :
                                                                            (
                                                                                isInvestigator ? transformEmail(user.contact, "investigator", "az.msdc.co") :
                                                                                    (
                                                                                        isStudyAssistant ? transformEmail(user.contact, "study-assistant", "az.msdc.co") :
                                                                                            null
                                                                                    )
                                                                            )
                                                                    )
                                                            )
                                                    )
                                            )
                                    )
                            )

                    ));
        });
    }

    // Set initial values
    setField('select[placeholder="Type of invite"]', "1: USER_INVITE");
}

// start the extension
// get a version number
updateVersion()

// Initialize the user selector when the popup is loaded
populateUserSelector();

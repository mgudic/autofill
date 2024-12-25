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
    console.log("autofillFieldsWithEvents func:");

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

    // Listen for changes in "Type of invite" to enable dependent fields
    const typeInviteField = document.querySelector('select[placeholder="Type of invite"]');
    if (typeInviteField) {
        typeInviteField.addEventListener('change', () => {
            console.log("Type of invite changed, setting dependent fields...");
            setField('select[placeholder="Provider *"]', "0: userpod.idp.cognito.pingid");
            setField('select[placeholder="Country *"]', "233: GB");
            setField('select[placeholder="Type *"]', "2: EMAIL");
            setField('input[placeholder="First name *"]', user.firstName);
            setField('input[placeholder="Last name"]', user.lastName);
            setField('input[placeholder="Contact information *"]', user.contact);
        });
    }

    // Set initial values
    setField('select[placeholder="Type of invite"]', "1: USER_INVITE");
}

// Initialize the user selector when the popup is loaded
populateUserSelector();

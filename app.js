const STORAGE_KEY = "buymeData";

const defaultData = {
    username: "",
    listName: "My Shopping List",
    owner: "",
    members: [],
    location: "",
    markets: []
};

let data = loadData();

/* =========================
   ELEMENTS
========================= */

const usernameInput =
    document.getElementById("usernameInput");

const saveUsernameButton =
    document.getElementById("saveUsernameButton");

const usernameDisplay =
    document.getElementById("usernameDisplay");

const listNameInput =
    document.getElementById("listNameInput");

const saveListNameButton =
    document.getElementById("saveListNameButton");

const listOwnerDisplay =
    document.getElementById("listOwnerDisplay");

const locationInput =
    document.getElementById("locationInput");

const saveLocationButton =
    document.getElementById("saveLocationButton");

const locationDisplay =
    document.getElementById("locationDisplay");

const membersContainer =
    document.getElementById("membersContainer");

const inviteButton =
    document.getElementById("inviteButton");

const marketsContainer =
    document.getElementById("marketsContainer");

const addMarketButton =
    document.getElementById("addMarketButton");

const addMarketForm =
    document.getElementById("addMarketForm");

const marketNameInput =
    document.getElementById("marketNameInput");

const saveMarketButton =
    document.getElementById("saveMarketButton");

const cancelMarketButton =
    document.getElementById("cancelMarketButton");


/* =========================
   STORAGE
========================= */

function createId() {
    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
}


function normalizeData(rawData) {
    const safeData =
        rawData && typeof rawData === "object"
            ? rawData
            : {};

    const markets =
        Array.isArray(safeData.markets)
            ? safeData.markets
            : [];

    return {
        username:
            typeof safeData.username === "string"
                ? safeData.username
                : "",

        listName:
            typeof safeData.listName === "string" &&
            safeData.listName.trim()
                ? safeData.listName
                : defaultData.listName,

        owner:
            typeof safeData.owner === "string"
                ? safeData.owner
                : "",

        members:
            Array.isArray(safeData.members)
                ? safeData.members.filter(
                    member =>
                        typeof member === "string" &&
                        member.trim()
                )
                : [],

        location:
            typeof safeData.location === "string"
                ? safeData.location
                : "",

        markets: markets
            .filter(
                market =>
                    market &&
                    typeof market === "object"
            )
            .map(
                market => ({
                    id:
                        market.id ??
                        createId(),

                    name:
                        typeof market.name === "string"
                            ? market.name
                            : "Unnamed Market",

                    products:
                        Array.isArray(market.products)
                            ? market.products
                                .filter(
                                    product =>
                                        product &&
                                        typeof product === "object"
                                )
                                .map(
                                    product => ({
                                        id:
                                            product.id ??
                                            createId(),

                                        name:
                                            typeof product.name === "string"
                                                ? product.name
                                                : "Unnamed Product",

                                        status:
                                            [
                                                "pending",
                                                "purchased",
                                                "not_found"
                                            ].includes(
                                                product.status
                                            )
                                                ? product.status
                                                : "pending"
                                    })
                                )
                            : []
                })
            )
    };
}


function loadData() {
    const savedData =
        localStorage.getItem(STORAGE_KEY);

    if (!savedData) {
        return structuredClone(defaultData);
    }

    try {
        const parsedData =
            JSON.parse(savedData);

        return normalizeData(parsedData);
    } catch (error) {
        console.error(
            "Could not load BuyMe data:",
            error
        );

        return structuredClone(defaultData);
    }
}


function saveData() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );
}


/* =========================
   USER
========================= */

saveUsernameButton.addEventListener(
    "click",
    saveUsername
);


usernameInput.addEventListener(
    "keydown",
    event => {
        if (event.key === "Enter") {
            saveUsername();
        }
    }
);


function saveUsername() {
    const username =
        usernameInput.value.trim();

    if (!username) {
        alert(
            "Please enter a username."
        );

        usernameInput.focus();

        return;
    }

    data.username = username;

    if (!data.owner) {
        data.owner = username;
    }

    if (!data.members.includes(username)) {
        data.members.unshift(username);
    }

    saveData();
    renderAll();
}


/* =========================
   LIST NAME
========================= */

saveListNameButton.addEventListener(
    "click",
    saveListName
);


listNameInput.addEventListener(
    "keydown",
    event => {
        if (event.key === "Enter") {
            saveListName();
        }
    }
);


function saveListName() {
    const listName =
        listNameInput.value.trim();

    if (!listName) {
        alert(
            "Please enter a list name."
        );

        listNameInput.focus();

        return;
    }

    data.listName = listName;

    saveData();
    renderAll();
}


/* =========================
   LOCATION
========================= */

saveLocationButton.addEventListener(
    "click",
    saveLocation
);


locationInput.addEventListener(
    "keydown",
    event => {
        if (event.key === "Enter") {
            saveLocation();
        }
    }
);


function saveLocation() {
    const location =
        locationInput.value.trim();

    if (!location) {
        alert(
            "Please enter a location."
        );

        locationInput.focus();

        return;
    }

    data.location = location;

    saveData();
    renderAll();
}


/* =========================
   INVITE
========================= */

inviteButton.addEventListener(
    "click",
    () => {
        if (!isOwner()) {
            alert(
                "Only the list owner can invite members."
            );

            return;
        }

        alert(
            "The invitation system will be connected to Firebase later."
        );
    }
);


/* =========================
   ADD MARKET
========================= */

addMarketButton.addEventListener(
    "click",
    () => {
        addMarketForm.style.display = "block";
        addMarketButton.style.display = "none";

        marketNameInput.value = "";
        marketNameInput.focus();
    }
);


saveMarketButton.addEventListener(
    "click",
    saveMarket
);


cancelMarketButton.addEventListener(
    "click",
    cancelMarket
);


marketNameInput.addEventListener(
    "keydown",
    event => {
        if (event.key === "Enter") {
            saveMarket();
        }

        if (event.key === "Escape") {
            cancelMarket();
        }
    }
);


function saveMarket() {
    const marketName =
        marketNameInput.value.trim();

    if (!marketName) {
        marketNameInput.focus();

        return;
    }

    data.markets.push({
        id: createId(),
        name: marketName,
        products: []
    });

    saveData();

    addMarketForm.style.display = "none";
    addMarketButton.style.display = "block";

    marketNameInput.value = "";

    renderAll();
}


function cancelMarket() {
    addMarketForm.style.display = "none";
    addMarketButton.style.display = "block";

    marketNameInput.value = "";
}


/* =========================
   RENDER ALL
========================= */

function renderAll() {
    usernameInput.value =
        data.username;

    listNameInput.value =
        data.listName;

    locationInput.value =
        data.location;

    usernameDisplay.textContent =
        data.username
            ? `User: ${data.username}`
            : "";

    listOwnerDisplay.textContent =
        data.owner
            ? `Owner: ${data.owner}`
            : "";

    locationDisplay.textContent =
        data.location
            ? `Location: ${data.location}`
            : "";

    renderMembers();
    renderMarkets();

    inviteButton.style.display =
        isOwner()
            ? "block"
            : "none";
}


/* =========================
   MEMBERS
========================= */

function renderMembers() {
    membersContainer.innerHTML = "";

    if (data.members.length === 0) {
        membersContainer.innerHTML =
            '<p class="empty-message">No members yet.</p>';

        return;
    }

    data.members.forEach(
        member => {
            const memberElement =
                document.createElement("div");

            memberElement.className =
                "member-item";

            const ownerLabel =
                member === data.owner
                    ? "Owner"
                    : "Member";

            memberElement.innerHTML = `
                <span>
                    User: ${escapeHtml(member)}
                </span>

                <span class="member-role">
                    ${ownerLabel}
                </span>
            `;

            membersContainer.appendChild(
                memberElement
            );
        }
    );
}


/* =========================
   MARKETS
========================= */

function renderMarkets() {
    marketsContainer.innerHTML = "";

    if (data.markets.length === 0) {
        const emptyElement =
            document.createElement("p");

        emptyElement.className =
            "empty-markets";

        emptyElement.textContent =
            "No markets added yet.";

        marketsContainer.appendChild(
            emptyElement
        );

        return;
    }

    data.markets.forEach(
        market => {
            const marketElement =
                document.createElement("div");

            marketElement.className =
                "market";

            marketElement.dataset.marketId =
                market.id;

            marketElement.innerHTML = `
                <div class="market-header">

                    <h2>
                        Market: ${escapeHtml(market.name)}
                    </h2>

                    <button
                        class="delete-market"
                        onclick="deleteMarket('${escapeJsAttribute(market.id)}')">
                        Delete
                    </button>

                </div>

                <ul class="product-list">

                    ${
                        market.products.length === 0
                            ? `
                                <li class="empty-message">
                                    No products yet.
                                </li>
                            `
                            : market.products
                                .map(
                                    product => {
                                        const status =
                                            getProductStatus(
                                                product
                                            );

                                        const statusInfo =
                                            getStatusInfo(
                                                status
                                            );

                                        return `
                                            <li
                                                class="product-item"
                                                data-product-id="${escapeHtml(
                                                    String(product.id)
                                                )}">

                                                <button
                                                    class="status-button ${statusInfo.className}"
                                                    onclick="changeProductStatus(
                                                        '${escapeJsAttribute(market.id)}',
                                                        '${escapeJsAttribute(product.id)}'
                                                    )"
                                                    title="Change product status">

                                                    ${statusInfo.label}

                                                </button>

                                                <span
                                                    class="product-name ${statusInfo.className}"
                                                    onclick="editProduct(
                                                        '${escapeJsAttribute(market.id)}',
                                                        '${escapeJsAttribute(product.id)}'
                                                    )"
                                                    title="Click to edit">

                                                    ${escapeHtml(
                                                        product.name
                                                    )}

                                                </span>

                                                <button
                                                    class="delete-product"
                                                    onclick="deleteProduct(
                                                        '${escapeJsAttribute(market.id)}',
                                                        '${escapeJsAttribute(product.id)}'
                                                    )"
                                                    title="Delete product">

                                                    Delete

                                                </button>

                                            </li>
                                        `;
                                    }
                                )
                                .join("")
                    }

                </ul>

                <div class="add-product-row">

                    <input
                        type="text"
                        id="product-input-${escapeHtml(String(market.id))}"
                        placeholder="Add product..."
                        onkeydown="handleProductInputKeydown(
                            event,
                            '${escapeJsAttribute(market.id)}'
                        )"
                    >

                    <button
                        type="button"
                        onclick="addProduct('${escapeJsAttribute(market.id)}')">
                        + Add
                    </button>

                </div>
            `;

            marketsContainer.appendChild(
                marketElement
            );
        }
    );
}


/* =========================
   STATUS
========================= */

function getProductStatus(product) {
    const status =
        product && product.status;

    return [
        "pending",
        "purchased",
        "not_found"
    ].includes(status)
        ? status
        : "pending";
}


function getStatusInfo(status) {
    if (status === "purchased") {
        return {
            className: "purchased",
            label: "Purchased"
        };
    }

    if (status === "not_found") {
        return {
            className: "not-found",
            label: "Not found"
        };
    }

    return {
        className: "",
        label: "Pending"
    };
}


/* =========================
   ADD PRODUCT
========================= */

function handleProductInputKeydown(
    event,
    marketId
) {
    if (event.key === "Enter") {
        event.preventDefault();

        addProduct(marketId);
    }
}


function addProduct(marketId) {
    const input =
        document.getElementById(
            `product-input-${marketId}`
        );

    if (!input) {
        return;
    }

    const productName =
        input.value.trim();

    if (!productName) {
        input.focus();

        return;
    }

    const market =
        data.markets.find(
            market =>
                String(market.id) ===
                String(marketId)
        );

    if (!market) {
        return;
    }

    if (!Array.isArray(market.products)) {
        market.products = [];
    }

    market.products.push({
        id: createId(),
        name: productName,
        status: "pending"
    });

    saveData();
    renderAll();

    const newInput =
        document.getElementById(
            `product-input-${marketId}`
        );

    if (newInput) {
        newInput.focus();
    }
}


/* =========================
   EDIT PRODUCT
========================= */

function editProduct(
    marketId,
    productId
) {
    const market =
        data.markets.find(
            market =>
                String(market.id) ===
                String(marketId)
        );

    if (!market) {
        return;
    }

    const product =
        market.products.find(
            product =>
                String(product.id) ===
                String(productId)
        );

    if (!product) {
        return;
    }

    const productItem =
        document.querySelector(
            `.product-item[data-product-id="${CSS.escape(
                String(productId)
            )}"]`
        );

    if (!productItem) {
        return;
    }

    const nameElement =
        productItem.querySelector(
            ".product-name"
        );

    const statusButton =
        productItem.querySelector(
            ".status-button"
        );

    const deleteButton =
        productItem.querySelector(
            ".delete-product"
        );

    if (!nameElement) {
        return;
    }

    const originalName =
        product.name;

    nameElement.outerHTML = `
        <input
            class="edit-product-input"
            type="text"
            value="${escapeHtml(originalName)}"
        >

        <button
            class="save-product-button"
            type="button"
            title="Save">
            Save
        </button>

        <button
            class="cancel-product-button"
            type="button"
            title="Cancel">
            Cancel
        </button>
    `;

    if (statusButton) {
        statusButton.disabled = true;
    }

    if (deleteButton) {
        deleteButton.disabled = true;
    }

    const editInput =
        productItem.querySelector(
            ".edit-product-input"
        );

    const saveButton =
        productItem.querySelector(
            ".save-product-button"
        );

    const cancelButton =
        productItem.querySelector(
            ".cancel-product-button"
        );

    if (!editInput ||
        !saveButton ||
        !cancelButton) {
        return;
    }

    editInput.focus();
    editInput.select();


    saveButton.addEventListener(
        "click",
        () => {
            const newName =
                editInput.value.trim();

            if (!newName) {
                alert(
                    "Product name cannot be empty."
                );

                editInput.focus();

                return;
            }

            product.name = newName;

            saveData();
            renderAll();
        }
    );


    cancelButton.addEventListener(
        "click",
        () => {
            renderAll();
        }
    );


    editInput.addEventListener(
        "keydown",
        event => {
            if (event.key === "Enter") {
                event.preventDefault();

                saveButton.click();
            }

            if (event.key === "Escape") {
                event.preventDefault();

                cancelButton.click();
            }
        }
    );
}


/* =========================
   CHANGE PRODUCT STATUS
========================= */

function changeProductStatus(
    marketId,
    productId
) {
    const market =
        data.markets.find(
            market =>
                String(market.id) ===
                String(marketId)
        );

    if (!market) {
        return;
    }

    const product =
        market.products.find(
            product =>
                String(product.id) ===
                String(productId)
        );

    if (!product) {
        return;
    }

    const currentStatus =
        getProductStatus(product);

    if (currentStatus === "pending") {
        product.status =
            "purchased";
    } else if (
        currentStatus === "purchased"
    ) {
        product.status =
            "not_found";
    } else {
        product.status =
            "pending";
    }

    saveData();
    renderAll();
}


/* =========================
   DELETE PRODUCT
========================= */

function deleteProduct(
    marketId,
    productId
) {
    const market =
        data.markets.find(
            market =>
                String(market.id) ===
                String(marketId)
        );

    if (!market) {
        return;
    }

    const product =
        market.products.find(
            product =>
                String(product.id) ===
                String(productId)
        );

    if (!product) {
        return;
    }

    const confirmed =
        confirm(
            `Delete "${product.name}"?`
        );

    if (!confirmed) {
        return;
    }

    market.products =
        market.products.filter(
            product =>
                String(product.id) !==
                String(productId)
        );

    saveData();
    renderAll();
}


/* =========================
   DELETE MARKET
========================= */

function deleteMarket(marketId) {
    const market =
        data.markets.find(
            market =>
                String(market.id) ===
                String(marketId)
        );

    if (!market) {
        return;
    }

    const productCount =
        Array.isArray(market.products)
            ? market.products.length
            : 0;

    const message =
        productCount > 0
            ? `Delete "${market.name}" and its ${productCount} product(s)?`
            : `Delete "${market.name}"?`;

    const confirmed =
        confirm(message);

    if (!confirmed) {
        return;
    }

    data.markets =
        data.markets.filter(
            market =>
                String(market.id) !==
                String(marketId)
        );

    saveData();
    renderAll();
}


/* =========================
   OWNER
========================= */

function isOwner() {
    return Boolean(
        data.username &&
        data.owner &&
        data.username === data.owner
    );
}


/* =========================
   HTML SECURITY
========================= */

function escapeHtml(text) {
    const div =
        document.createElement("div");

    div.textContent =
        String(text ?? "");

    return div.innerHTML;
}


function escapeJsAttribute(value) {
    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}


/* =========================
   START
========================= */

renderAll();

(() => {
  "use strict";

  const SHOP_WHATSAPP_NUMBER = "923138859611";
  const STORAGE_KEY = "kashmir-roll-point-cart-v1";

  const CATEGORY_ORDER = [
    "all",
    "Roll",
    "B.B.Q",
    "Paratha & Chapati",
    "Fast Food"
  ];

  const money = value =>
    `PKR ${new Intl.NumberFormat("en-PK").format(value)}`;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const validProducts = Array.isArray(window.products)
    ? window.products.filter(
        item =>
          item &&
          Number.isInteger(item.id) &&
          item.name &&
          item.category &&
          Number.isFinite(Number(item.price)) &&
          Number(item.price) >= 0 &&
          typeof item.stock === "boolean"
      )
    : [];

  const byId = new Map(
    validProducts.map(item => [item.id, item])
  );

  let state = {
    query: "",
    category: "all",
    cart: loadCart()
  };

  function loadCart() {
    try {
      const parsed = JSON.parse(
        localStorage.getItem(STORAGE_KEY)
      );

      if (!parsed || typeof parsed !== "object") {
        return {};
      }

      const cleanedCart = {};

      Object.entries(parsed).forEach(
        ([id, quantity]) => {
          const productId = Number(id);

          if (
            byId.has(productId) &&
            Number(quantity) > 0
          ) {
            cleanedCart[productId] =
              Math.min(99, Number(quantity));
          }
        }
      );

      return cleanedCart;
    } catch {
      return {};
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state.cart)
      );
    } catch {}
  }

  function toast(message) {
    const region = $("#toast-region");

    if (!region) return;

    const node = document.createElement("div");

    node.className = "toast";
    node.textContent = message;

    region.append(node);

    setTimeout(() => {
      node.remove();
    }, 3000);
  }

  function filteredProducts() {
    const query = state.query.toLowerCase();

    return validProducts.filter(item => {
      const categoryMatch =
        state.category === "all" ||
        item.category === state.category;

      const searchText =
        `${item.name} ${item.category}`.toLowerCase();

      const searchMatch =
        !query ||
        searchText.includes(query);

      return categoryMatch && searchMatch;
    });
  }

  function updateSearchMode() {
    const menuSection = $(".menu-section");

    if (!menuSection) return;

    const searching = Boolean(state.query);

    menuSection.classList.toggle(
      "is-searching",
      searching
    );
  }

  function renderCategories() {
    const categoryList = $("#category-list");

    if (!categoryList) return;

    const availableCategories =
      CATEGORY_ORDER.filter(
        category =>
          category === "all" ||
          validProducts.some(
            item =>
              item.category === category
          )
      );

    categoryList.replaceChildren(
      ...availableCategories.map(category => {
        const button =
          document.createElement("button");

        button.type = "button";

        button.className =
          `category-button${
            state.category === category
              ? " is-active"
              : ""
          }`;

        button.textContent =
          category === "all"
            ? "All items"
            : category;

        button.setAttribute(
          "role",
          "tab"
        );

        button.setAttribute(
          "aria-selected",
          state.category === category
        );

        button.addEventListener(
          "click",
          () => {
            state.category = category;
            state.query = "";

            const searchInput =
              $("#menu-search");

            const clearButton =
              $("#clear-search-button");

            if (searchInput) {
              searchInput.value = "";
            }

            if (clearButton) {
              clearButton.hidden = true;
            }

            render();
          }
        );

        return button;
      })
    );
  }

  function render() {
    renderCategories();
    renderMenu();
    updateSearchMode();
  }

  function renderMenu() {
    const items =
      filteredProducts();

    const grid =
      $("#menu-grid");

    if (!grid) return;

    grid.replaceChildren();

    items.forEach(item => {
      const card =
        $("#menu-card-template")
          .content
          .firstElementChild
          .cloneNode(true);

      const image =
        $("[data-product-image]", card);

      if (image) {
        image.src =
          item.image ||
          "images/menu/default-food.jpg";

        image.alt =
          item.name;

        image.loading = "lazy";

        image.addEventListener(
          "error",
          () => {
            image.src =
              "images/menu/default-food.jpg";
          }
        );
      }

      $(
        "[data-product-category]",
        card
      ).textContent =
        item.category;

      $(
        "[data-product-name]",
        card
      ).textContent =
        item.name;

      $(
        "[data-product-price]",
        card
      ).textContent =
        money(item.price);

      const stock =
        $("[data-stock-badge]", card);

      const add =
        $("[data-add-to-cart]", card);

      if (!item.stock) {
        stock.textContent =
          "Out of stock";

        stock.classList.add(
          "is-out"
        );

        add.disabled = true;

        add.textContent =
          "Unavailable";
      } else {
        add.addEventListener(
          "click",
          () =>
            addToCart(item.id)
        );
      }

      grid.append(card);
    });

    $("#menu-result-count").textContent =
      `${items.length} item${
        items.length === 1
          ? ""
          : "s"
      }`;

    $("#menu-status").textContent =
      validProducts.length
        ? ""
        : "Menu data is unavailable";

    $("#empty-menu-state").hidden =
      validProducts.length !== 0;

    $("#no-search-results-state").hidden =
      !(
        validProducts.length &&
        !items.length
      );
  }

  function addToCart(id) {
    const item =
      byId.get(id);

    if (!item || !item.stock) {
      return toast(
        "That item is currently unavailable."
      );
    }

    state.cart[id] =
      Math.min(
        99,
        (Number(state.cart[id]) || 0) + 1
      );

    saveCart();

    renderCart();

    toast(
      `${item.name} added to cart.`
    );
  }

  function changeQuantity(
    id,
    amount
  ) {
    if (!byId.has(id)) return;

    const next =
      (Number(state.cart[id]) || 0) +
      amount;

    if (next <= 0) {
      delete state.cart[id];
    } else {
      state.cart[id] =
        Math.min(99, next);
    }

    saveCart();

    renderCart();
  }

  function cartEntries() {
    return Object.entries(
      state.cart
    )
      .map(
        ([id, quantity]) => ({
          item:
            byId.get(Number(id)),

          quantity:
            Math.max(
              0,
              Math.min(
                99,
                Number(quantity) || 0
              )
            )
        })
      )
      .filter(
        entry =>
          entry.item &&
          entry.quantity &&
          entry.item.stock
      );
  }

  function renderCart() {
    const entries =
      cartEntries();

    const count =
      entries.reduce(
        (sum, entry) =>
          sum + entry.quantity,
        0
      );

    const total =
      entries.reduce(
        (sum, entry) =>
          sum +
          entry.quantity *
            entry.item.price,
        0
      );

    [
      $("#header-cart-count"),
      $("#floating-cart-count")
    ].forEach(node => {
      if (!node) return;

      node.textContent =
        count;

      node.setAttribute(
        "aria-label",
        `${count} items in cart`
      );
    });

    $("#cart-empty-state").hidden =
      entries.length > 0;

    $("#cart-summary").hidden =
      entries.length === 0;

    const list =
      $("#cart-items");

    list.replaceChildren();

    entries.forEach(
      ({ item, quantity }) => {
        const row =
          $("#cart-item-template")
            .content
            .firstElementChild
            .cloneNode(true);

        $(
          "[data-cart-item-name]",
          row
        ).textContent =
          item.name;

        $(
          "[data-cart-item-price]",
          row
        ).textContent =
          money(item.price);

        $(
          "[data-cart-item-subtotal]",
          row
        ).textContent =
          money(
            item.price *
            quantity
          );

        $(
          "[data-cart-item-quantity]",
          row
        ).textContent =
          quantity;

        $(
          "[data-increase-quantity]",
          row
        ).addEventListener(
          "click",
          () =>
            changeQuantity(
              item.id,
              1
            )
        );

        $(
          "[data-decrease-quantity]",
          row
        ).addEventListener(
          "click",
          () =>
            changeQuantity(
              item.id,
              -1
            )
        );

        $(
          "[data-remove-item]",
          row
        ).addEventListener(
          "click",
          () => {
            delete state.cart[
              item.id
            ];

            saveCart();

            renderCart();
          }
        );

        list.append(row);
      }
    );

    $("#cart-subtotal").textContent =
      money(total);

    $("#cart-total").textContent =
      money(total);
  }

  function toggleCart(open) {
    $("#cart-drawer").hidden =
      !open;

    $("#cart-backdrop").hidden =
      !open;

    document.body.classList.toggle(
      "cart-open",
      open
    );

    $("#header-cart-button")
      .setAttribute(
        "aria-expanded",
        open
      );

    if (open) {
      $("#close-cart-button").focus();
    }
  }

  function openCheckout() {
    if (!cartEntries().length) {
      return toast(
        "Your cart is empty."
      );
    }

    $("#checkout-modal")
      .showModal();
  }

  function buildOrderMessage(order) {
    return (
      `[KASHMIR ROLL POINT] - NEW ORDER\n\n` +
      `Order Number: ${order.orderNumber}\n\n` +
      `CUSTOMER DETAILS\n\n` +
      `Name: ${order.customerName}\n` +
      `Phone: ${order.customerPhone}\n` +
      `Address: ${order.customerAddress}\n\n` +
      `ORDER DETAILS\n\n` +
      `${order.items
        .map(
          (entry, index) =>
            `${index + 1}. ${entry.name}\n` +
            `Quantity: ${entry.quantity}\n` +
            `Price: ${money(entry.price)}`
        )
        .join("\n\n")}\n\n` +
      `TOTAL: ${money(order.total)}\n\n` +
      `Payment: Cash on Delivery\n\n` +
      `Thank you for ordering!`
    );
  }

  function submitCheckout(event) {
    event.preventDefault();

    const form =
      new FormData(
        event.currentTarget
      );

    const customerName =
      String(
        form.get("customerName") ||
          ""
      ).trim();

    const customerPhone =
      String(
        form.get("customerPhone") ||
          ""
      ).trim();

    const customerAddress =
      String(
        form.get("customerAddress") ||
          ""
      ).trim();

    const error =
      $("#checkout-error");

    if (
      !customerName ||
      !customerAddress ||
      !/^[+\d][\d\s-]{6,18}$/.test(
        customerPhone
      )
    ) {
      error.textContent =
        "Enter your name, a valid phone number and delivery address.";

      error.hidden = false;

      return;
    }

    const entries =
      cartEntries();

    const order = {
      orderNumber:
        `ORD-${Date.now()
          .toString()
          .slice(-6)}`,

      date:
        new Date().toISOString(),

      customerName,
      customerPhone,
      customerAddress,

      items:
        entries.map(
          ({
            item,
            quantity
          }) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity
          })
        ),

      total:
        entries.reduce(
          (sum, entry) =>
            sum +
            entry.quantity *
              entry.item.price,
          0
        )
    };

    try {
      sessionStorage.setItem(
        "kashmir-roll-point-order",
        JSON.stringify(order)
      );
    } catch {}

    state.cart = {};

    saveCart();

    const message =
      buildOrderMessage(order);

    window.open(
      `https://wa.me/${SHOP_WHATSAPP_NUMBER}?text=${encodeURIComponent(
        message
      )}`,
      "_blank",
      "noopener,noreferrer"
    );

    $("#checkout-modal")
      .close();

    event.currentTarget.reset();

    renderCart();

    window.location.href =
      "receipt.html";
  }

  $("#menu-search")
    .addEventListener(
      "input",
      event => {
        state.query =
          event.target.value.trim();

        $("#clear-search-button")
          .hidden =
          !state.query;

        if (state.query) {
          state.category =
            "all";
        }

        render();
      }
    );

  $("#clear-search-button")
    .addEventListener(
      "click",
      () => {
        $("#menu-search")
          .value = "";

        state.query = "";
        state.category = "all";

        $("#clear-search-button")
          .hidden = true;

        render();

        $("#menu-search")
          .focus();
      }
    );

  $("#header-cart-button")
    .addEventListener(
      "click",
      () => toggleCart(true)
    );

  $("#floating-cart-button")
    .addEventListener(
      "click",
      () => toggleCart(true)
    );

  $("#close-cart-button")
    .addEventListener(
      "click",
      () => toggleCart(false)
    );

  $("#cart-backdrop")
    .addEventListener(
      "click",
      () => toggleCart(false)
    );

  $("#checkout-button")
    .addEventListener(
      "click",
      openCheckout
    );

  $("#close-checkout-button")
    .addEventListener(
      "click",
      () =>
        $("#checkout-modal")
          .close()
    );

  $("#checkout-form")
    .addEventListener(
      "submit",
      submitCheckout
    );

  Array.from(
    document.querySelectorAll(
      "[data-scroll-target]"
    )
  ).forEach(button => {
    button.addEventListener(
      "click",
      () => {
        toggleCart(false);

        document
          .querySelector(
            button.dataset
              .scrollTarget
          )
          .scrollIntoView({
            behavior:
              "smooth"
          });
      }
    );
  });

  $("#scroll-top-button")
    .addEventListener(
      "click",
      () =>
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        })
    );

  window.addEventListener(
    "scroll",
    () =>
      $("#scroll-top-button")
        .classList.toggle(
          "is-visible",
          window.scrollY > 400
        ),
    { passive: true }
  );

  render();
  renderCart();
})();

document.addEventListener("DOMContentLoaded", function () {

  const popup = document.getElementById("recent-sales-popup");
  if (!popup) return;

  const delay = parseInt(popup.dataset.delay) * 1000;

  const customers = [
    { name: "Vikram P.", city: "Pune" },
    { name: "Anjali K.", city: "Mumbai" },
    { name: "Rohit S.", city: "Delhi" },
    { name: "Priya M.", city: "Bangalore" }
  ];

  const products = [
    "Hair Growth Serum",
    "Pain Relief Oil",
    "Skin Brightening Cream",
    "Immunity Booster"
  ];

  function randomTime() {
    const minutes = Math.floor(Math.random() * 59) + 1;
    return `${minutes} min ago`;
  }

  function showPopup() {
    const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
    const randomProduct = products[Math.floor(Math.random() * products.length)];

    document.getElementById("popup-customer").innerText = randomCustomer.name;
    document.getElementById("popup-city").innerText = randomCustomer.city;
    document.getElementById("popup-product").innerText = randomProduct;
    document.getElementById("popup-time").innerText = randomTime();

    popup.style.display = "flex";

    setTimeout(() => {
      popup.style.display = "none";
    }, 5000);
  }

  popup.querySelector(".popup-close").addEventListener("click", function () {
    popup.style.display = "none";
  });

  setInterval(showPopup, delay);
});

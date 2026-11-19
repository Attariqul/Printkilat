// PrintKilat Client-Side Interactivity (Vanilla JS ES6)
document.addEventListener("DOMContentLoaded", () => {
  // 1. Demo Operator Quick Fill on Entry Page
  const fillDemoBtn = document.getElementById("fillDemoOperatorBtn");
  if (fillDemoBtn) {
    fillDemoBtn.addEventListener("click", () => {
      const emailInput = document.getElementById("operatorEmail");
      const passInput = document.getElementById("operatorPassword");
      if (emailInput) emailInput.value = "operator@printkilat.id";
      if (passInput) passInput.value = "printkilat123";
    });
  }

  // 2. Copy-to-Clipboard Buttons
  document.querySelectorAll("[data-copy-text]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = btn.getAttribute("data-copy-text") || "";
      try {
        await navigator.clipboard.writeText(text);
        const origHtml = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check2"></i>';
        setTimeout(() => {
          btn.innerHTML = origHtml;
        }, 1600);
      } catch (_) {
        // Clipboard API fallback ignored
      }
    });
  });

  // 3. Order Calculator & Stepper on /tamu/pesan
  const orderForm = document.getElementById("createOrderForm");
  if (orderForm) {
    const fileInput = document.getElementById("documentInput");
    const fileTitleEl = document.getElementById("selectedFileTitle");
    const fileMetaEl = document.getElementById("selectedFileMeta");
    const printSelect = document.getElementById("printTariffSelect");
    const bindSelect = document.getElementById("bindTariffSelect");
    const pageInput = document.getElementById("pageCountInput");
    const copiesInput = document.getElementById("copiesInput");
    const minusCopiesBtn = document.getElementById("minusCopiesBtn");
    const plusCopiesBtn = document.getElementById("plusCopiesBtn");
    const transferBox = document.getElementById("transferInfoBox");
    const paymentRadios = orderForm.querySelectorAll('input[name="payment_method"]');

    const formatRupiah = (val) => {
      return "Rp " + Math.round(val).toLocaleString("id-ID");
    };

    const recalculate = () => {
      const printOpt = printSelect?.selectedOptions?.[0];
      const bindOpt = bindSelect?.selectedOptions?.[0];
      const printRate = Number(printOpt?.dataset?.price || 0);
      const bindRate = Number(bindOpt?.dataset?.price || 0);
      const pages = Math.max(1, Number.parseInt(pageInput?.value || "1", 10) || 1);
      const copies = Math.max(1, Number.parseInt(copiesInput?.value || "1", 10) || 1);

      const printSubtotal = printRate * pages * copies;
      const bindSubtotal = bindRate * copies;
      const total = printSubtotal + bindSubtotal;

      const printSummaryLabel = document.getElementById("summaryPrintLabel");
      const printSummaryVal = document.getElementById("summaryPrintValue");
      const bindSummaryLabel = document.getElementById("summaryBindLabel");
      const bindSummaryVal = document.getElementById("summaryBindValue");
      const desktopTotalEl = document.getElementById("desktopTotalValue");
      const mobileTotalEl = document.getElementById("mobileTotalValue");
      const mobileMetaEl = document.getElementById("mobileSummaryMeta");

      if (printSummaryLabel) {
        printSummaryLabel.textContent = `${pages} hlm × ${formatRupiah(printRate)} × ${copies} rangkap`;
      }
      if (printSummaryVal) printSummaryVal.textContent = formatRupiah(printSubtotal);
      if (bindSummaryLabel) {
        const bindName = bindOpt?.dataset?.name || "Tanpa jilid";
        bindSummaryLabel.textContent = `${bindName} (${copies} rangkap)`;
      }
      if (bindSummaryVal) bindSummaryVal.textContent = formatRupiah(bindSubtotal);
      if (desktopTotalEl) desktopTotalEl.textContent = formatRupiah(total);
      if (mobileTotalEl) mobileTotalEl.textContent = formatRupiah(total);
      if (mobileMetaEl) {
        mobileMetaEl.textContent = `${pages} hlm · ${copies} rangkap`;
      }
    };

    if (fileInput) {
      fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const sizeMb = file.size < 1024 * 1024
          ? `${Math.max(1, Math.round(file.size / 1024))} KB`
          : `${(file.size / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
        if (fileTitleEl) fileTitleEl.textContent = file.name;
        if (fileMetaEl) fileMetaEl.textContent = `${sizeMb} · ketuk untuk ganti`;
      });
    }

    minusCopiesBtn?.addEventListener("click", () => {
      const current = Math.max(1, Number.parseInt(copiesInput.value || "1", 10) || 1);
      copiesInput.value = String(Math.max(1, current - 1));
      recalculate();
    });

    plusCopiesBtn?.addEventListener("click", () => {
      const current = Math.max(1, Number.parseInt(copiesInput.value || "1", 10) || 1);
      copiesInput.value = String(Math.min(200, current + 1));
      recalculate();
    });

    [printSelect, bindSelect, pageInput, copiesInput].forEach((el) => {
      el?.addEventListener("input", recalculate);
      el?.addEventListener("change", recalculate);
    });

    paymentRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (!transferBox) return;
        transferBox.classList.toggle("d-none", radio.value !== "transfer" || !radio.checked);
      });
    });

    recalculate();
  }
});

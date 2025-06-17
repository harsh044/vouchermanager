import React, { useState } from "react";
import "./OfferAutoParser.css";

const initialFormState = {
  title: "",
  platform: "",
  sharedVia: "",
  voucherCode: "",
  link: "",
  expiry: "",
};

const OfferAutoParser = () => {
  const [rawText, setRawText] = useState("");
  const [parsedData, setParsedData] = useState(initialFormState);
  const [allVouchers, setAllVouchers] = useState([]);
  const [showListOnly, setShowListOnly] = useState(false);
  const [saving, setSaving] = useState(false);      // loader for submit
  const [fetching, setFetching] = useState(false);  // loader for get all vouchers

  const detectPlatform = (text) => {
    const brandRegexList = [
      /rummycircle/i, /goindigo\.in|indigo/i, /spotify/i, /zomato/i,
      /swiggy/i, /flipkart/i, /myntra/i, /paytm/i, /amazon/i, /phonepe/i,
    ];

    for (const regex of brandRegexList) {
      const match = text.match(regex);
      if (match) return match[0];
    }

    const urlMatch = text.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      try {
        const hostname = new URL(urlMatch[0]).hostname;
        return hostname.replace(/^www\./, '').split('.')[0];
      } catch (e) {
        return "";
      }
    }

    return "";
  };

  const handleParse = () => {
    const lines = rawText.split("\n").map(line => line.trim()).filter(Boolean);
    const title = lines[1] && lines[2] ? lines[1] + " " + lines[2] : lines[0] || "";

    const platform = detectPlatform(rawText);
    const voucherMatch = rawText.match(/Voucher code:\s*([A-Za-z0-9-]+)/i);
    const expiryMatch = rawText.match(/Expiring in (\d+) days?/i);
    const linkMatch = rawText.match(/https?:\/\/[^\s]+/i);
    const sharedViaMatch = rawText.match(/on (.*?)!/i);

    const expiryDate = expiryMatch
      ? new Date(Date.now() + parseInt(expiryMatch[1]) * 86400000).toISOString().split("T")[0]
      : "";

    setParsedData({
      title,
      platform,
      sharedVia: sharedViaMatch ? sharedViaMatch[1] : "Google Pay",
      voucherCode: voucherMatch ? voucherMatch[1] : "",
      link: linkMatch ? linkMatch[0] : "",
      expiry: expiryDate,
    });
  };

  const handleSubmit = async () => {
    const { title, platform, sharedVia, voucherCode, link, expiry } = parsedData;

    if (!title || !platform || !sharedVia || !voucherCode || !link || !expiry) {
      alert("❌ Please fill in all the fields before submitting.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("https://wkfje2xiqkxccdphibiro4l3va0owdbp.lambda-url.ap-south-1.on.aws/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedData),
      });

      const data = await response.json();

      if (data.status === "duplicate") {
        alert("⚠️ Duplicate voucher code. Not saved.");
      } else if (response.ok) {
        alert("✅ Data saved!");
      } else {
        alert("❌ Failed to save data.");
      }

      setParsedData(initialFormState);
      setRawText("");
    } catch (error) {
      console.error("Submit error:", error);
      alert("⚠️ Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handleGetVouchers = async () => {
    try {
      setFetching(true);
      const response = await fetch("https://27o3ceonjle6cbbc4at7tz455m0vueob.lambda-url.ap-south-1.on.aws/");
      const data = await response.json();
      setAllVouchers(data.vouchers || []);
      setShowListOnly(true);
    } catch (error) {
      console.error("Fetch error:", error);
      alert("⚠️ Failed to load vouchers.");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Voucher Manager</h2>

      {!showListOnly ? (
        <>
          <textarea
            rows={6}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste voucher details here..."
          />

          <div className="action-buttons">
            <button onClick={handleParse}>Parse & Fill</button>
            <button onClick={handleGetVouchers} disabled={fetching}>
              {fetching ? "⏳ Loading Vouchers..." : "Get All Vouchers"}
            </button>
          </div>

          <div className="form-fields">
            {Object.entries(parsedData).map(([key, value], idx) => (
              <div className="form-row" key={idx}>
                <label>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}:</label>
                <input
                  type={key === "link" ? "url" : key === "expiry" ? "date" : "text"}
                  value={value}
                  onChange={(e) => setParsedData({ ...parsedData, [key]: e.target.value })}
                />
              </div>
            ))}

            <button onClick={handleSubmit} className="submit-button" disabled={saving}>
              {saving ? "🚀 Submitting..." : "Submit"}
            </button>
          </div>
        </>
      ) : (
        <div className="voucher-list">
          <h3>All Vouchers</h3>
          {allVouchers.length === 0 ? (
            <p style={{ color: 'gray', fontStyle: 'italic' }}>⚠️ No vouchers found.</p>
          ) : (
            allVouchers.map((voucher, idx) => (
              <div key={idx} className="voucher-card">
                <p><strong>Title:</strong> {voucher.title || "(No title)"}</p>
                <p><strong>Voucher Code:</strong> {voucher.voucherCode}</p>
                <p>
                  <strong>Link:</strong>{" "}
                  <a href={voucher.link} target="_blank" rel="noopener noreferrer">
                    {voucher.link}
                  </a>
                </p>
                <p><strong>Expiry Date:</strong> {voucher.expiry}</p>
              </div>
            ))
          )}
          <button onClick={() => setShowListOnly(false)}>🔙 Back to Form</button>
        </div>
      )}
    </div>
  );
};

export default OfferAutoParser;

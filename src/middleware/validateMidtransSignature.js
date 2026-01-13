const crypto = require("crypto");

/**
 * Middleware untuk validasi signature dari Midtrans webhook
 * Memastikan notification benar-benar dari Midtrans
 */
const validateMidtransSignature = (req, res, next) => {
  try {
    const { order_id, status_code, gross_amount } = req.body;
    const signatureKey = req.get("x-signature") || req.body.signature_key;

    // Build signature data
    const signatureData = `${order_id}${status_code}${gross_amount}${process.env.MIDTRANS_SERVER_KEY}`;

    // Create SHA512 hash
    const computedSignature = crypto
      .createHash("sha512")
      .update(signatureData)
      .digest("hex");

    // Compare signatures
    if (signatureKey !== computedSignature) {
      console.warn("❌ Invalid Midtrans signature detected");
      return res.status(403).json({
        message: "Invalid signature - request denied",
      });
    }

    console.log("✅ Midtrans signature validated");
    next();
  } catch (error) {
    console.error("Signature Validation Error:", error);
    return res.status(500).json({
      message: `Signature validation error - ${error.message}`,
    });
  }
};

module.exports = validateMidtransSignature;

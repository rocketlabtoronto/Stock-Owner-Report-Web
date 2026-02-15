import PropTypes from "prop-types";
ConsentModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onConsent: PropTypes.func.isRequired,
};
import { useState } from "react";
import PrivacyPolicyModal from "./PrivacyPolicyModal";
import TermsOfUseModal from "./TermsOfUseModal";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";

export default function ConsentModal({ open, onConsent }) {
  const [checked, setChecked] = useState({
    age: false,
    terms: false,
    access: false,
    ownership: false,
  });

  const handleChange = (key) => (event) => {
    setChecked((prev) => ({ ...prev, [key]: event.target.checked }));
  };

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const allChecked = Object.values(checked).every(Boolean);

  return (
    <>
      <Dialog open={open}>
        <DialogTitle>Consent Required</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 15, color: "#444" }}
        >
          <span style={{ fontWeight: 400, fontSize: 15, color: "#444" }}>
            By continuing, you agree to the following:
          </span>
          <ul
            style={{
              marginLeft: 20,
              marginBottom: 12,
              fontWeight: 400,
              fontSize: 15,
              color: "#444",
            }}
          >
            <li>You authorize read-only access to your investment data via SnapTrade.</li>
            <li>
              You understand that no trades or transfers can be made from your account throught this
              platform. We provide reports only.
            </li>
            <li>
              You agree to our{" "}
              <a
                href="#"
                style={{
                  textDecorationLine: "underline",
                  textDecorationStyle: "solid",
                  textDecorationThickness: "2px",
                  textUnderlineOffset: "2px",
                  fontWeight: 400,
                  fontSize: 15,
                  color: "#444",
                  WebkitTextDecorationLine: "underline",
                  WebkitTextDecorationStyle: "solid",
                  WebkitTextDecorationThickness: "2px",
                  WebkitTextUnderlineOffset: "2px",
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setPrivacyOpen(true);
                }}
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a
                href="#"
                style={{
                  textDecorationLine: "underline",
                  textDecorationStyle: "solid",
                  textDecorationThickness: "2px",
                  textUnderlineOffset: "2px",
                  fontWeight: 400,
                  fontSize: 15,
                  color: "#444",
                  WebkitTextDecorationLine: "underline",
                  WebkitTextDecorationStyle: "solid",
                  WebkitTextDecorationThickness: "2px",
                  WebkitTextUnderlineOffset: "2px",
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setTermsOpen(true);
                }}
              >
                Terms of Use
              </a>
              .
            </li>
            <li>Your data is hosted in the U.S. and complies with PIPEDA and CCPA.</li>
            <li>This service is only available in the U.S. and Canada.</li>
            <li>You indemnify LookThroughProfits.com against any losses.</li>
            <li>
              Your data may be processed and stored in the United States. While the data is subject
              to U.S. laws, we apply strict contractual and technical safeguards to protect it. By
              using this service, you consent to this data transfer as permitted under Canada’s
              PIPEDA.
            </li>
          </ul>
          <div
            style={{
              marginLeft: 20,
              marginBottom: 0,
              fontWeight: 400,
              fontSize: 15,
              color: "#444",
            }}
          >
            <FormControlLabel
              control={<Checkbox checked={checked.age} onChange={handleChange("age")} />}
              label={
                <span style={{ fontWeight: 400, fontSize: 15, color: "#444" }}>
                  I am 18+ and legally able to agree.
                </span>
              }
            />
            <FormControlLabel
              control={<Checkbox checked={checked.terms} onChange={handleChange("terms")} />}
              label={
                <span style={{ fontWeight: 400, fontSize: 15, color: "#444" }}>
                  I agree to the Privacy Policy and Terms of Use.
                </span>
              }
            />
            <FormControlLabel
              control={<Checkbox checked={checked.access} onChange={handleChange("access")} />}
              label={
                <span style={{ fontWeight: 400, fontSize: 15, color: "#444" }}>
                  I grant read-only access to my brokerage account for this session.
                </span>
              }
            />
            <FormControlLabel
              control={
                <Checkbox checked={checked.ownership} onChange={handleChange("ownership")} />
              }
              label={
                <span style={{ fontWeight: 400, fontSize: 15, color: "#444" }}>
                  You certify you own the linked brokerage accounts.
                </span>
              }
            />
          </div>
        </DialogContent>
        <DialogActions sx={{ flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <Button
              disabled={!allChecked}
              onClick={onConsent}
              variant="outlined"
              sx={{
                flex: 1,
                color: "#000",
                borderColor: "#000",
                backgroundColor: "#fff",
                fontWeight: 400,
                fontSize: 15,
                "&:hover": {
                  backgroundColor: "#f5f5f5",
                  borderColor: "#000",
                  color: "#000",
                },
                minWidth: 140,
              }}
            >
              I Consent
            </Button>
            <Button
              onClick={() => (open && typeof onConsent === "function" ? onConsent(false) : null)}
              variant="outlined"
              sx={{
                flex: 1,
                color: "#000",
                borderColor: "#000",
                backgroundColor: "#fff",
                fontWeight: 400,
                fontSize: 15,
                "&:hover": {
                  backgroundColor: "#f5f5f5",
                  borderColor: "#000",
                  color: "#000",
                },
                minWidth: 140,
              }}
            >
              I Refuse
            </Button>
          </div>
          <span style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
            You may click <b>I Refuse</b> at any time to close this dialog and decline consent.
          </span>
        </DialogActions>
      </Dialog>
      <PrivacyPolicyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <TermsOfUseModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </>
  );
}

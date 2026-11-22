/**
 * PaymentSuccessModal — Shown right after Stripe redirects back from a
 * successful checkout (see the `session_id` query param check in
 * [Billing](./index.js)). The user must click OK before continuing; it
 * cannot be dismissed by clicking outside or pressing Escape.
 */
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import PropTypes from "prop-types";

export default function PaymentSuccessModal({ open, onOk }) {
  return (
    <Dialog open={open} onClose={() => {}} disableEscapeKeyDown maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 20, pb: 0.5 }}>Payment successful</DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Typography variant="body2" sx={{ lineHeight: 1.65 }}>
          Check your inbox for your confirmation email. When it arrives, click{" "}
          <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
            Activate Subscription
          </Typography>{" "}
          in the email to activate your subscription. If the email lands in your Junk or Spam
          folder, mark it as{" "}
          <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
            Not junk
          </Typography>{" "}
          or{" "}
          <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
            Not spam
          </Typography>
          .
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          px: 3,
          py: 2,
          borderTop: "1px solid #d6d9de",
        }}
      >
        <Button
          variant="contained"
          onClick={onOk}
          sx={{
            backgroundColor: "#0d1b2a",
            color: "#fff",
            fontWeight: 600,
            px: 3.5,
            py: 1.1,
            fontSize: 13,
            borderRadius: 0,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            boxShadow: "none",
            "&:hover": { backgroundColor: "#1a3a5c", boxShadow: "none" },
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}

PaymentSuccessModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onOk: PropTypes.func.isRequired,
};

import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import PropTypes from "prop-types";

function ManualUploadInstructionsModal({
  open,
  onClose,
  brokerageName,
  onFileChange,
  onUpload,
  selectedFile,
}) {
  // Template download link (assume public/template.csv or adjust as needed)
  const templateUrl = "/template.csv";
  // Ref for file input
  const fileInputRef = React.useRef();
  const handleChooseFile = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 0, boxShadow: "0 4px 24px rgba(13,27,42,0.12)" } }}
    >
      <DialogTitle sx={{
        fontWeight: 700,
        fontSize: 18,
        color: "#0d1b2a",
        borderBottom: "1px solid #d6d9de",
        pb: 1.5,
      }}>
        Manual Upload Required
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 12, top: 10, color: "#9CA3AF", "&:hover": { color: "#0d1b2a", background: "none" } }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5 }}>
        <Typography sx={{ fontSize: 14, color: "#4B5563", lineHeight: 1.7, mb: 1 }}>
          Direct API integration is not currently available for <strong style={{ color: "#0d1b2a" }}>{brokerageName}</strong>.
        </Typography>
        <Typography sx={{ fontSize: 14, color: "#4B5563", lineHeight: 1.7, mb: 1 }}>
          To connect your account, please manually download your transaction or holdings file from
          your brokerage&apos;s online portal and upload it here.
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: "#4B5563", lineHeight: 1.7, mt: 1.5, mb: 1.5 }}>
          Please ensure your upload file matches our required format. You can download a sample
          template{" "}
          <a href={templateUrl} download style={{ textDecoration: "underline" }}>
            here
          </a>
          .
          <br />
          <b>Instructions:</b> The file must be a CSV with the following structure:
          <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
            <li>
              The first row should specify the account name (e.g.,{" "}
              <i>Account,TD Direct Investing - 79X006U,</i>). You can name this anything you want.
            </li>
            <li>The next row should be left blank.</li>
            <li>
              Then, include a header row: <i>Symbol,Market,Quantity</i>.
            </li>
            <li>
              Each subsequent row should list a holding with its symbol, market, and quantity.
            </li>
          </ul>
          <span style={{ color: "#9CA3AF", fontSize: 12.5 }}>
            If you have questions, please contact support for assistance.
          </span>
        </Typography>
        <Button
          variant="outlined"
          onClick={handleChooseFile}
          sx={{
            mt: 2,
            backgroundColor: "#fff",
            color: "#0d1b2a",
            borderColor: "#0d1b2a",
            borderRadius: 0,
            fontWeight: 600,
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: 1.1,
            boxShadow: "none",
            "&:hover": { backgroundColor: "#F9FAFB", borderColor: "#0d1b2a", boxShadow: "none" },
            minWidth: 160,
          }}
        >
          Choose File
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={onFileChange}
          style={{ display: "none" }}
        />
        {selectedFile && (
          <Typography sx={{ fontSize: 12.5, color: "#4B5563", mt: 1 }}>
            Selected file: {selectedFile.name}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 1.5,
        px: 3,
        py: 2,
        borderTop: "1px solid #d6d9de",
      }}>
        <Button
          onClick={onClose}
          sx={{
            fontWeight: 600,
            textTransform: "none",
            color: "#6b7280",
            fontSize: 13,
            px: 2,
            "&:hover": { background: "none", color: "#0d1b2a" },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onUpload}
          variant="contained"
          disabled={!selectedFile}
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
            "&:disabled": { backgroundColor: "#9ca3af", color: "#fff" },
          }}
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ManualUploadInstructionsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  brokerageName: PropTypes.string.isRequired,
  onFileChange: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
  selectedFile: PropTypes.oneOfType([
    PropTypes.instanceOf(File),
    PropTypes.shape({ name: PropTypes.string }),
  ]),
};

export default ManualUploadInstructionsModal;

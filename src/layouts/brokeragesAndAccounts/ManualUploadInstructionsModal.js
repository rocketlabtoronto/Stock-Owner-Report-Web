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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Manual Upload Required
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography gutterBottom>
          Direct API integration is not currently available for <b>{brokerageName}</b>.
        </Typography>
        <Typography gutterBottom>
          To connect your account, please manually download your transaction or holdings file from
          your brokerage&apos;s online portal and upload it here.
        </Typography>
        <Typography variant="body2" sx={{ mt: 2, mb: 2, color: "#444" }}>
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
          <span style={{ color: "#888", fontSize: 13 }}>
            If you have questions, please contact support for assistance.
          </span>
        </Typography>
        <Button
          variant="outlined"
          onClick={handleChooseFile}
          sx={{
            mt: 2,
            backgroundColor: "#fff",
            color: "#000",
            borderColor: "#000",
            fontWeight: 500,
            fontSize: 16,
            "&:hover": { backgroundColor: "#f5f5f5", borderColor: "#000", color: "#000" },
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
          <Typography variant="body2" sx={{ mt: 1 }}>
            Selected file: {selectedFile.name}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" sx={{ textTransform: "none", fontWeight: 500 }}>
          Cancel
        </Button>
        <Button
          onClick={onUpload}
          variant="contained"
          color="primary"
          disabled={!selectedFile}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            color: "#fff",
            "&.Mui-disabled": { opacity: 0.5, color: "#fff" },
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

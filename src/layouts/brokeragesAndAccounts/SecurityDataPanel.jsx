import PropTypes from "prop-types";
import { Box, Button, Paper, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import DevicesOutlinedIcon from "@mui/icons-material/DevicesOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";

export default function SecurityDataPanel({ onDetails, mt = 0 }) {
  return (
    <Paper
      elevation={0}
      sx={{
        mt,
        mb: 0,
        borderRadius: 0,
        border: "none",
        borderTop: "1px solid #d6d9de",
        borderBottom: "1px solid #d6d9de",
        backgroundColor: "#fff",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: { xs: 4, md: 6 },
          py: 2,
          borderBottom: "1px solid #d6d9de",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 3,
            color: "#0d1b2a",
            textTransform: "uppercase",
          }}
        >
          Security &amp; Data Handling
        </Typography>
        <Button
          variant="text"
          size="small"
          onClick={() => onDetails()}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            color: "#1a3a5c",
            fontSize: 12,
            px: 0,
            minWidth: 0,
            "&:hover": { background: "none", textDecoration: "underline" },
          }}
        >
          View full details →
        </Button>
      </Box>

      {/* Four items as a clean table-like row grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        }}
      >
        {[
          [
            LockOutlinedIcon,
            "Credential Security",
            "Authentication occurs inside SnapTrade's secure portal. This platform never receives, stores, or transmits your brokerage username or password.",
          ],
          [
            VisibilityOffOutlinedIcon,
            "Read-Only Access",
            "Holdings, balances, and transactions are retrieved in read-only mode. No trades or transfers can be executed through this platform.",
          ],
          [
            DevicesOutlinedIcon,
            "Local Device Storage",
            "Dashboard data is stored in your browser to power the interface. It remains on your device and is not uploaded to our servers.",
          ],
          [
            AccountBalanceOutlinedIcon,
            "Platform Independence",
            "The Stock Owner's Report is not affiliated with, sponsored by, or endorsed by any brokerage or financial institution.",
          ],
        ].map(([Icon, heading, body], i) => (
          <Box
            key={heading}
            sx={{
              px: { xs: 4, md: 6 },
              py: 2.5,
              borderBottom: i < 2 ? "1px solid #d6d9de" : "none",
              borderRight: i % 2 === 0 ? { xs: "none", sm: "1px solid #d6d9de" } : "none",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
              <Icon sx={{ fontSize: 16, color: "#0d1b2a", flexShrink: 0 }} />
              <Typography
                sx={{ fontSize: 12, fontWeight: 700, color: "#111827", letterSpacing: 0.2 }}
              >
                {heading}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 14, color: "#4B5563", lineHeight: 1.7 }}>{body}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

SecurityDataPanel.propTypes = { onDetails: PropTypes.func.isRequired, mt: PropTypes.number };

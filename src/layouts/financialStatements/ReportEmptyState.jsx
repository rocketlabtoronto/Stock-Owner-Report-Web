import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// What a report shows when it has nothing to chart: centered when it stands alone, or a
// compact panel when the account's holdings are listed underneath it.
export default function ReportEmptyState({ icon: Icon, title, description, action, compact }) {
  return (
    <Box
      role="status"
      data-testid="report-empty-state"
      sx={{
        display: "flex",
        flexDirection: compact ? "row" : "column",
        alignItems: compact ? "flex-start" : "center",
        textAlign: compact ? "left" : "center",
        gap: 2,
        ...(compact
          ? { p: 2, mb: 2, background: "#f8f9fb", border: "1px solid #e3e6eb", flexShrink: 0 }
          : { flex: 1, justifyContent: "center", px: 3, py: 4 }),
      }}
    >
      <Box
        sx={{
          width: compact ? 40 : 56,
          height: compact ? 40 : 56,
          borderRadius: "50%",
          background: "#e9edf2",
          color: "#0d1b2a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: compact ? 22 : 28 }} />
      </Box>
      <Box sx={{ maxWidth: compact ? 820 : 460 }}>
        <Typography sx={{ fontSize: compact ? 15 : 17, fontWeight: 700, color: "#0d1b2a" }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 13, lineHeight: 1.6, color: "#4b5563" }}>
          {description}
        </Typography>
        {action && <Box sx={{ mt: 1.5 }}>{action}</Box>}
      </Box>
    </Box>
  );
}

ReportEmptyState.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  action: PropTypes.node,
  compact: PropTypes.bool,
};

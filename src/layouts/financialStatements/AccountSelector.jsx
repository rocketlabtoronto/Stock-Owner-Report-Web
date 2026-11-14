import PropTypes from "prop-types";
import { Box, ButtonBase } from "@mui/material";
import CustomTypography from "components/CustomTypography";

const ellipsis = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

export default function AccountSelector({ accounts, selectedAccountId, onSelect }) {
  return (
    <Box display="flex" flexWrap="wrap" gap={0.75} mb={1}>
      {accounts.map((account) => {
        const selected = selectedAccountId === account.id;
        const available = account.isAvailable !== false;
        return (
          <ButtonBase
            key={account.id}
            onClick={() => onSelect(account.id)}
            disabled={!available}
            aria-pressed={selected}
            title={`${account.brokerageName} #${account.accountNumber}`}
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              gap: 0.75,
              border: "none",
              borderRadius: 0,
              px: 1,
              py: 0.45,
              minHeight: 34,
              minWidth: { xs: "100%", md: 220 },
              maxWidth: { xs: "100%", md: 420 },
              backgroundColor: selected ? "#f0f2f5" : "#ffffff",
              boxShadow: selected ? "inset 0 -2px 0 #0d1b2a" : "none",
              opacity: available ? 1 : 0.6,
              "&.Mui-disabled": { cursor: "not-allowed" },
            }}
          >
            <img src={account.logo} alt={`${account.brokerageName} logo`} style={{ height: 14 }} />
            <Box display="flex" alignItems="center" gap={0.45} sx={{ minWidth: 0 }}>
              <CustomTypography
                variant="button"
                color="text"
                sx={{
                  ...ellipsis,
                  fontWeight: 600,
                  fontSize: 13,
                  maxWidth: { xs: "100%", md: 180 },
                }}
              >
                {account.brokerageName}
              </CustomTypography>
              {account.accountNumber && (
                <CustomTypography
                  variant="caption"
                  color="text"
                  sx={{ fontSize: 11.5, whiteSpace: "nowrap" }}
                >
                  #{account.accountNumber}
                </CustomTypography>
              )}
              {!available && (
                <CustomTypography
                  variant="caption"
                  sx={{
                    ...ellipsis,
                    color: "text.secondary",
                    fontSize: 11,
                    maxWidth: { xs: "100%", md: 165 },
                  }}
                >
                  Unsupported market:{" "}
                  {account.disallowedMarkets?.join(", ") || "Unsupported market"}
                </CustomTypography>
              )}
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}

AccountSelector.propTypes = {
  accounts: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedAccountId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

import PropTypes from "prop-types";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Icon from "@mui/material/Icon";
import CustomBox from "components/CustomBox";
import { item, itemIcon, itemText, itemIconBox } from "ui/Sidenav/styles/sidenavItem";
import { useCustomController } from "context";

function SidenavItem({ icon, name, active = false }) {
  const [{ miniSidenav }] = useCustomController();

  return (
    <ListItem component="li">
      <CustomBox sx={(theme) => item(theme, { active, miniSidenav })}>
        <ListItemIcon sx={(theme) => itemIconBox(theme, { active })}>
          {typeof icon === "string" ? (
            <Icon sx={(theme) => itemIcon(theme, { active })}>{icon}</Icon>
          ) : (
            icon
          )}
        </ListItemIcon>
        <ListItemText primary={name} sx={(theme) => itemText(theme, { miniSidenav, active })} />
      </CustomBox>
    </ListItem>
  );
}

SidenavItem.propTypes = {
  icon: PropTypes.node.isRequired,
  name: PropTypes.string.isRequired,
  active: PropTypes.bool,
};

export default SidenavItem;

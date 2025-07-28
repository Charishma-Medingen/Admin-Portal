import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./components/common/Sidebar";
import AddModal from "./components/common/AddModal";
import AuthIndex from "./screens/AuthIndex";
import MainIndex from "./screens/MainIndex";
import { checkLogin } from "./components/api";

function App(props) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!checkLogin()) {
      navigate("/sign-in");
    }
  }, [navigate]);

  const activekey = () => window.location.pathname;

  if (
    activekey() === "/sign-in" ||
    activekey() === "/sign-up" ||
    activekey() === "/reset-password" ||
    activekey() === "/verification" ||
    activekey() === "/page-404"
  ) {
    return (
      <div id="medingen-layout" className="theme-blue">
        <AuthIndex />
      </div>
    );
  }

  return (
    <div id="medingen-layout" className="theme-blue">
      <Sidebar activekey={activekey()} history={props.history} />
      <AddModal />
      <MainIndex activekey={activekey()} />
    </div>
  );
}

export default App;
import ImageSrc from "../../assets/images/google.svg";
import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import {handleSignIn} from '../api';
import { useNavigate } from 'react-router-dom';

const SignIn = () => {
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleUsernameChange = (e) => {
        setUsername(e.target.value);
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
    };

    return (
        <div className="col-lg-6 d-flex justify-content-center align-items-center border-0 rounded-lg auth-h100" >
            <div className="w-100 p-3 p-md-5 card border-0 shadow-sm" style={{ maxwidth: "32rem" }}>
                <form className="row g-1 p-3 p-md-4 mt-5" onSubmit={(e) => e.preventDefault()}>
                    <div className="col-12 text-center mb-0">
                        <h1>Sign in</h1>
                        <span>Medingen Backend admin portal.</span>
                    </div>
                    <div className="col-12 text-center mb-4">
                        <span className="dividers text-muted mt-4">Credentials</span>
                    </div>
                    <div className="col-12">
                        <div className="mb-2">
                            <label className="form-label">Username</label>
                            <input type="text" className="form-control form-control-lg lift" placeholder="admin" value={username} onChange={handleUsernameChange} />
                        </div>
                    </div>
                    <div className="col-12">
                        <div className="mb-2">
                            <div className="form-label">
                                <span className="d-flex justify-content-between align-items-center">
                                    Password
                                </span>
                            </div>
                            <input type="password" className="form-control form-control-lg lift" placeholder="***************" value={password} onChange={handlePasswordChange} />
                        </div>
                    </div>
                    <div className="col-12">
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" value="" id="flexCheckDefault" />
                            <label className="form-check-label" htmlFor="flexCheckDefault">
                                Remember me
                            </label>
                        </div>
                    </div>
                    <div className="col-12 text-center mt-4">
                        <button type="button" onClick={() => {handleSignIn(username, password, navigate)}} className="btn btn-lg btn-block btn-light lift text-uppercase">SIGN IN</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SignIn;
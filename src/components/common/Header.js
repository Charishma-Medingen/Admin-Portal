import React, { useState, useEffect } from 'react';
import { Dropdown, Image } from 'react-bootstrap';
import GB from '../../assets/images/flag/GB.png';
import DE from '../../assets/images/flag/DE.png';
import FR from '../../assets/images/flag/FR.png';
import IT from '../../assets/images/flag/IT.png';
import RU from '../../assets/images/flag/RU.png';
import Avatar1 from '../../assets/images/xs/avatar1.svg';
import Avatar3 from '../../assets/images/xs/avatar3.svg';
import Avatar5 from '../../assets/images/xs/avatar5.svg';
import Avatar6 from '../../assets/images/xs/avatar6.svg';
import Avatar7 from '../../assets/images/xs/avatar7.svg';
import Profile from '../../assets/images/profile_av.svg';
import { connect } from 'react-redux';
import { Onopenmodalsetting } from '../../Redux/Actions/Action';
import { Link } from 'react-router-dom';
import Cookies from 'js-cookie';
import {API_ENDPOINT, getNotifications} from '../api';
import Swal from 'sweetalert2';
import axios from 'axios';
import md5 from "crypto-js/md5";

function Header (props) {
    // Read the username and email from cookie
    const username = Cookies.get('username');
    const email = Cookies.get('email');

    // function to handle sign out
    const handleSignOut = (navigate) => {
        Cookies.remove('jwt_token');
        Cookies.remove('username');
        Cookies.remove('email');
        navigate('/sign-in');
    }

    const handleChangeAdminPassword = () => {
          Swal.fire({
            title: 'Change Password',
            html: `
              <input type="password" id="current-password" class="swal2-input" placeholder="Current Password">
              <input type="password" id="new-password" class="swal2-input" placeholder="New Password">
              <input type="password" id="confirm-password" class="swal2-input" placeholder="Confirm Password">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Submit',
            preConfirm: () => {
              const current_password = document.getElementById('current-password').value;
              const new_password = document.getElementById('new-password').value;
              const confirmPassword = document.getElementById('confirm-password').value;
        
              if (!current_password || !new_password || !confirmPassword) {
                Swal.showValidationMessage('All fields are required');
                return false;
              }
        
              if (new_password !== confirmPassword) {
                Swal.showValidationMessage('New Password and Confirm Password must match');
                return false;
              }
        
              return { current_password: md5(current_password).toString(), new_password: md5(new_password).toString() };
            }
          }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire('Please wait', 'Changing password...', 'info');
                const token = Cookies.get('jwt_token');
              axios.post(API_ENDPOINT + 'change-password', result.value,
                {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                  }
              )
                .then(response => {
                  Swal.fire('Success', 'Password changed successfully', 'success');
                })
                .catch(error => {
                  Swal.fire('Error', error.response?.data?.message || 'Something went wrong', 'error');
                });
            }
          });

        }

    const [notifications, setNotifications] = useState({ notifications: [], current_page: 1, total_pages: 1 });

    async function fetchNotifications(page = 1) {
        try {
            const notificationsData = await getNotifications(page); 
            setNotifications(notificationsData);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }

        return (
            <div className="header">
                <nav className="navbar py-4">
                    <div className="container-xxl">
                        <div className="h-right d-flex align-items-center order-1">  
                            <div className="d-flex mx-2 mt-1">
                                
                            </div>
                            
                            <Dropdown className="dropdown user-profilem ms-2 ms-sm-3 d-flex align-items-center zindex-popover">
                                <div className="u-info me-2">
                                    <p className="mb-0 text-end line-height-sm "><span className="font-weight-bold">{username}</span></p>
                                    <small>Admin Profile</small>
                                </div>
                                <Dropdown.Toggle as='a' className="nav-link dropdown-toggle pulse p-0 mb-3" href="#!" role="button">
                                    <img className="avatar lg rounded-circle img-thumbnail" src={Profile} alt="profile" />
                                </Dropdown.Toggle>
                                <Dropdown.Menu className="dropdown-menu rounded-lg shadow border-0 dropdown-animation dropdown-menu-end p-0 m-0 mt-5 ">
                                    <div className="card border-0   w280">
                                        <div className="card-body pb-0 ">
                                            <div className="d-flex py-1">
                                                <img className="avatar rounded-circle" src={Profile} alt="" />
                                                <div className="flex-fill ms-3">
                                                    <p className="mb-0"><span className="font-weight-bold">{username}</span></p>
                                                    <small>{email}</small>
                                                </div>
                                            </div>
                                            <div><hr className="dropdown-divider border-dark " /></div>
                                        </div>
                                        <div className="list-group m-2 ">
                                            <a href="javascript:;" onClick={handleChangeAdminPassword} className="list-group-item list-group-item-action border-0 "><i className="icofont-logout fs-5 me-3"></i>Change password</a>
                                        </div>
                                        <div className="list-group m-2 ">
                                            <Link to={"/sign-in"} onClick={handleSignOut} className="list-group-item list-group-item-action border-0 "><i className="icofont-logout fs-5 me-3"></i>Signout</Link>
                                        </div>
                                    </div>
                                </Dropdown.Menu>
                            </Dropdown>
                            <div className="setting ms-2">
                                <a href='#!' onClick={(val) => {props.Onopenmodalsetting(true) }} ><i className="icofont-gear-alt fs-5"></i></a>
                            </div>
                        </div>
                        <button className="navbar-toggler p-0 border-0 menu-toggle order-3" type="button" onClick={() => {
                            var sidebar = document.getElementById('mainsidemenu')
                            if (sidebar) {
                                if (sidebar.classList.contains('open')) {
                                    sidebar.classList.remove('open')
                                } else {
                                    sidebar.classList.add('open')
                                }
                            }
                        }}>
                            <span className="fa fa-bars"></span>
                        </button>
                        <div className="order-0 col-lg-4 col-md-4 col-sm-12 col-12 mb-4  ">
                            
                        </div>
                    </div>
                </nav>
            </div>
        )
    }


const mapSatetToProps = ({ Mainreducer }) => ({
    Mainreducer
})


export default connect(mapSatetToProps, {
    Onopenmodalsetting
})(Header);
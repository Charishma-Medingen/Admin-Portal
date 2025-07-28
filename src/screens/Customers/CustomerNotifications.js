import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import DataTable from "react-data-table-component";
import Swal from "sweetalert2";
import { getCustomerList } from "../../components/api";
import Profile from "../../assets/images/profile_av.svg";
import { API_ENDPOINT } from "../../components/api";
import { ProgressBar } from "react-bootstrap";
import axios from "axios";

function CustomerNotifications() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [sendingProgress, setSendingProgress] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [sortColumn, setSortColumn] = useState("register_date_time");
  const [sortDirection, setSortDirection] = useState("desc");
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const mapping_dict = {
    "Customer ID": "customer_id",
    "Customer Name": "customer_name",
    "Phone Number": "phonenumber",
  };

  const fetchCustomers = async (page, sortColumn, sortDirection, searchtext, perPage) => {
    try {
      const response = await getCustomerList(page, sortColumn, sortDirection, searchtext, perPage);
      setCustomers(response.customers);
      setTotalRows(response.total_customers);
    } catch (error) {
      Swal.fire("Error", "Failed to load customers", "error");
    }
  };

  useEffect(() => {
    fetchCustomers(page, sortColumn, sortDirection, searchText, rowsPerPage);
  }, [page, sortColumn, sortDirection, searchText, rowsPerPage]);

  const handlePageChange = (page) => {
    setPage(page);
  };

  const handleRowsPerPageChange = (currentRowsPerPage, currentPage) => {
    setRowsPerPage(currentRowsPerPage);
    setPage(1); // Reset to first page when changing rows per page
  };

  const handleSort = (column, direction) => {
    setSortColumn(mapping_dict[column.name]);
    setSortDirection(direction);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCustomers(customers.map(customer => customer.customer_id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelectCustomer = (customerId) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  const sendNotifications = async () => {
    if (selectedCustomers.length === 0) {
      Swal.fire("Error", "Please select at least one customer", "error");
      return;
    }

    if (!notificationMessage.trim()) {
      Swal.fire("Error", "Please enter a notification message", "error");
      return;
    }

    setIsSending(true);
    setSendingProgress(0);

    const token = Cookies.get("jwt_token");
    const totalCustomers = selectedCustomers.length;
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < selectedCustomers.length; i++) {
      const customerId = selectedCustomers[i];
      try {
        await axios.post(
          `${API_ENDPOINT}create_notification`,
          {
            receiver: customerId,
            message: notificationMessage,
            date_received: new Date().toISOString(),
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        successCount++;
      } catch (error) {
        failedCount++;
      }

      setSendingProgress(((i + 1) / totalCustomers) * 100);
    }

    setIsSending(false);
    Swal.fire({
      title: "Notifications Sent",
      html: `Successfully sent to ${successCount} customers<br>Failed to send to ${failedCount} customers`,
      icon: "info",
    });
  };

  const columns = [
    {
      name: "Select",
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedCustomers.includes(row.customer_id)}
          onChange={() => handleSelectCustomer(row.customer_id)}
        />
      ),
      width: "70px",
    },
    {
      name: "Customer ID",
      selector: (row) => row.customer_id,
      sortable: true,
    },
    {
      name: "Customer Name",
      selector: (row) => row.customer_name,
      sortable: true,
    },
    {
      name: "Phone Number",
      selector: (row) => row.phonenumber,
      sortable: true,
    },
  ];

  return (
    <div className="body d-flex py-lg-3 py-md-2">
      <div className="container-xxl">
        <div className="row clearfix g-3">
          <div className="col-sm-12">
            <div className="card mb-3">
              <div className="card-body">
                {/* Search Input */}
                <div className="row mb-3">
                  <div className="col-sm-12">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search customers..."
                      value={searchText}
                      onChange={(e) => {
                        setSearchText(e.target.value);
                        setPage(1); // Reset to first page when searching
                      }}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.length === customers.length}
                    onChange={handleSelectAll}
                  />
                  <span className="ms-2">Select All</span>
                </div>
                <DataTable
                  columns={columns}
                  data={customers}
                  pagination
                  paginationServer
                  paginationTotalRows={totalRows}
                  onChangePage={handlePageChange}
                  onChangeRowsPerPage={handleRowsPerPageChange}
                  onSort={handleSort}
                  sortServer
                  paginationPerPage={rowsPerPage}
                  paginationRowsPerPageOptions={[10, 30, 50, 100]}
                  highlightOnHover
                />
              </div>
            </div>
          </div>
        </div>

        <div className="row clearfix g-3">
          <div className="col-sm-12">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Send Notification</h5>
                <div className="mb-3">
                  <p className="text-muted">
                    {selectedCustomers.length} {selectedCustomers.length === 1 ? 'customer' : 'customers'} selected for notification
                  </p>
                  <p className="text-info">
                    Note: Maximum 100 notifications can be sent in one batch.
                  </p>
                  {selectedCustomers.length > 100 && (
                    <p className="text-danger">
                      Warning: Please reduce your selection to 100 or fewer customers.
                    </p>
                  )}
                </div>
                <div className="mb-3">
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Enter notification message"
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    disabled={isSending}
                  />
                </div>
                {isSending && (
                  <div className="mb-3">
                    <ProgressBar
                      now={sendingProgress}
                      label={`${Math.round(sendingProgress)}%`}
                    />
                  </div>
                )}
                <button
                  className="btn btn-primary"
                  onClick={sendNotifications}
                  disabled={isSending || selectedCustomers.length > 100}
                >
                  {isSending ? "Sending..." : "Send Notifications"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerNotifications; 
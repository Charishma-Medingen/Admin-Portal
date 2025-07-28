import { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import PageHeader1 from "../../components/common/PageHeader1";
import Swal from "sweetalert2";
import {
  getCustomerList,
  addCustomer,
  editCustomer,
} from "../../components/api";
import Profile from "../../assets/images/profile_av.svg";
import * as XLSX from 'xlsx';
import { ProgressBar } from 'react-bootstrap';

function CustomerList() {
  const [table_row, setTable_row] = useState([]);
  const [ismodal, setIsmodal] = useState(false);
  const [iseditmodal, setIseditmodal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [editCustomerData, setEditCustomerData] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    customer_name: "",
    email: "",
    phonenumber: "",
    register_date_time: "",
    state: "",
    total_order: 0,
  });
  const [sortColumn, setSortColumn] = useState("register_date_time"); // default sort column
  const [sortDirection, setSortDirection] = useState("desc"); // default sort direction
  const [searchtext, setSearchText] = useState(""); // Initialize search text
  const [rowsPerPage, setRowsPerPage] = useState(10); // Add rows per page state
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const navigate = useNavigate();

  const mapping_dict = {
    ID: "customer_id",
    CUSTOMER: "customer_name",
    "REGISTER DATE": "register_date_time",
    MAIL: "email",
    PHONE: "phonenumber",
    STATE: "state",
    "TOTAL ORDER": "total_order",
  };

  const fetchCustomers = async (
    page,
    sortColumn,
    sortDirection,
    searchtext,
    perPage
  ) => {
    try {
      const response = await getCustomerList(
        page,
        sortColumn,
        sortDirection,
        searchtext,
        perPage
      );
      setTable_row(response.customers);
      setTotalRows(response.total_customers);
    } catch (error) {
      Swal.fire("Error", "Failed to load customers", "error");
    }
  };

  useEffect(() => {
    fetchCustomers(page, sortColumn, sortDirection, searchtext, rowsPerPage);
  }, [page, sortColumn, sortDirection, searchtext, rowsPerPage]);

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

  const handleAddCustomer = async () => {
    const phoneRegex = /^\d{10}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRegex = /^[a-zA-Z\s]{2,}$/;

    if (!nameRegex.test(newCustomer.customer_name)) {
      Swal.fire("Error", "Customer name must be at least 2 letters", "error");
      return;
    }
    if (newCustomer.email && !emailRegex.test(newCustomer.email)) {
      Swal.fire("Error", "Invalid email format", "error");
      return;
    }
    if (!phoneRegex.test(newCustomer.phonenumber)) {
      Swal.fire("Error", "Phone number must be 10 digits", "error");
      return;
    }
    if (!newCustomer.created_name || newCustomer.created_name.trim() === "") {
      Swal.fire("Error", "Created name is required", "error");
      return;
    }

    Swal.showLoading();

    try {
      const message = await addCustomer(newCustomer);

      setIsmodal(false);
      fetchCustomers(page, sortColumn, sortDirection, searchtext, rowsPerPage);
      Swal.fire("Success", message, "success");

    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to add customer";
      Swal.fire("Error", message, "error");
    }
  };


  const handleEditCustomer = async () => {
    try {
      if (!editCustomerData) return;
      await editCustomer(editCustomerData.customer_id, editCustomerData);
      setIseditmodal(false);
      fetchCustomers(page, sortColumn, sortDirection, searchtext, rowsPerPage);
      Swal.fire("Success", "Customer updated successfully", "success");
    } catch (error) {
      Swal.fire("Error", "Failed to update customer", "error");
    }
  };

  const handleViewClick = (customer) => {
    console.log(customer);
    navigate(`/customer-detail/`, {
      state: { customer_id: customer.customer_id },
    });
  };

  const handleEditClick = (customer) => {
    setEditCustomerData({ ...customer });
    setIseditmodal(true);
  };

  const downloadCurrentPage = () => {
    const worksheet = XLSX.utils.json_to_sheet(table_row.map(row => ({
      'Customer ID': row.customer_id,
      'Customer Name': row.customer_name,
      'Register Date': row.register_date_time,
      'Email': row.email,
      'Phone': row.phonenumber,
      'State': row.state,
      'Total Orders': row.total_order
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, `customers_page_${page}.xlsx`);
  };

  const downloadAllPages = async () => {
    setIsDownloadingAll(true);
    setDownloadProgress(0);

    try {
      let allCustomers = [];
      let currentPage = 1;
      let hasMorePages = true;
      const downloadLimit = 100; // Fixed limit for downloading all records

      while (hasMorePages) {
        const response = await getCustomerList(
          currentPage,
          sortColumn,
          sortDirection,
          searchtext,
          downloadLimit
        );

        allCustomers = [...allCustomers, ...response.customers];

        // Calculate progress
        const progress = (currentPage / Math.ceil(response.total_customers / downloadLimit)) * 100;
        setDownloadProgress(Math.min(progress, 100));

        if (currentPage * downloadLimit >= response.total_customers) {
          hasMorePages = false;
        } else {
          currentPage++;
        }
      }

      const worksheet = XLSX.utils.json_to_sheet(allCustomers.map(row => ({
        'Customer ID': row.customer_id,
        'Customer Name': row.customer_name,
        'Register Date': row.register_date_time,
        'Email': row.email,
        'Phone': row.phonenumber,
        'State': row.state,
        'Total Orders': row.total_order,
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "All Customers");
      XLSX.writeFile(workbook, "all_customers.xlsx");

      Swal.fire("Success", "All customers downloaded successfully", "success");
    } catch (error) {
      Swal.fire("Error", "Failed to download all customers", "error");
    } finally {
      setIsDownloadingAll(false);
      setDownloadProgress(0);
    }
  };

  const columns = [
    {
      name: "ID",
      selector: (row) => row.customer_id,
      sortable: true,
      maxWidth: "30px",
    },
    {
      name: "CUSTOMER",
      selector: (row) => row.customer_name,
      cell: (row) => (
        <>
          <img
            className="avatar rounded lg border"
            src={
              row.profile_picture.startsWith("https")
                ? row.profile_picture
                : (row.profile_picture ? `https://d26lh6sqkii1nb.cloudfront.net/profilepic/${row.profile_picture}` : Profile)
            }
            alt={row.customer_name || "Profile Image"}
          />
          <span className="px-2">
            {row.customer_name}
            {!!row.created_name && (
              <small className="text-muted ms-1" style={{ fontSize: "0.8em" }}>
                ({row.created_name})
              </small>
            )}
          </span>
        </>
      ),
      sortable: true,
      minWidth: "200px",
    },
    {
      name: "REGISTER DATE",
      selector: (row) => row.register_date_time,
      sortable: true,
    },
    {
      name: "MAIL",
      selector: (row) => row.email,
      sortable: true,
    },
    {
      name: "PHONE",
      selector: (row) => row.phonenumber,
      sortable: true,
    },
    {
      name: "STATE",
      selector: (row) => row.state,
      sortable: true,
    },
    {
      name: "# ORDER",
      selector: (row) => row.total_order,
      sortable: true,
      maxWidth: "50px",
    },
    {
      name: "ACTION",
      cell: (row) => (
        <>
          <div className="btn-group" role="group">
            <button
              onClick={() => handleViewClick(row)}
              type="button"
              className="btn btn-sm btn-primary me-2"
            >
              View
            </button>
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="body d-flex py-lg-3 py-md-2">
      <div className="container-xxl">
        <PageHeader1
          pagetitle="Customers Information"
          modalbutton={() => (
            <div className="col-auto d-flex w-sm-100">
              <button
                type="button"
                onClick={() => setIsmodal(true)}
                className="btn btn-primary btn-set-task w-sm-100 me-2"
              >
                <i className="icofont-plus-circle me-2 fs-6"></i>Add Customers
              </button>
              <button
                type="button"
                onClick={downloadCurrentPage}
                className="btn btn-success btn-set-task w-sm-100 me-2"
              >
                <i className="icofont-download me-2 fs-6"></i>Download Current Page
              </button>
              <button
                type="button"
                onClick={downloadAllPages}
                className="btn btn-info btn-set-task w-sm-100"
                disabled={isDownloadingAll}
              >
                <i className="icofont-download me-2 fs-6"></i>Download All Pages
              </button>
            </div>
          )}
        />

        {/* Search Input */}
        <div className="row mb-3">
          <div className="col-sm-12">
            <input
              type="text"
              className="form-control"
              placeholder="Search customers..."
              value={searchtext}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1); // Reset to the first page when searching
              }}
            />
          </div>
        </div>

        <div className="row clearfix g-3">
          <div className="col-sm-12">
            <div className="card mb-3">
              <div className="card-body">
                {isDownloadingAll && (
                  <div className="mb-3">
                    <ProgressBar
                      now={downloadProgress}
                      label={`${Math.round(downloadProgress)}%`}
                    />
                    <small className="text-muted">Downloading all customers...</small>
                  </div>
                )}
                <DataTable
                  columns={columns}
                  data={table_row}
                  pagination
                  paginationServer
                  paginationTotalRows={totalRows}
                  onChangePage={handlePageChange}
                  onChangeRowsPerPage={handleRowsPerPageChange}
                  onSort={handleSort}
                  sortServer
                  paginationPerPage={rowsPerPage}
                  paginationRowsPerPageOptions={[10, 30, 50, 100]}
                  highlightOnHover={true}
                  defaultSortFieldId={3}
                  defaultSortAsc={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      <Modal show={iseditmodal} onHide={() => setIseditmodal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Customer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form>
            <div className="mb-3">
              <label className="form-label">Customer Name</label>
              <input
                type="text"
                className="form-control"
                value={editCustomerData?.customer_name || ""}
                onChange={(e) =>
                  setEditCustomerData({
                    ...editCustomerData,
                    customer_name: e.target.value,
                  })
                }
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={editCustomerData?.email || ""}
                onChange={(e) =>
                  setEditCustomerData({
                    ...editCustomerData,
                    email: e.target.value,
                  })
                }
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Phone</label>
              <input
                type="text"
                className="form-control"
                value={editCustomerData?.phonenumber || ""}
                onChange={(e) =>
                  setEditCustomerData({
                    ...editCustomerData,
                    phonenumber: e.target.value,
                  })
                }
              />
            </div>
            <div className="mb-3">
              <label className="form-label">State</label>
              <input
                type="text"
                className="form-control"
                value={editCustomerData?.state || ""}
                onChange={(e) =>
                  setEditCustomerData({
                    ...editCustomerData,
                    state: e.target.value,
                  })
                }
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Total Orders</label>
              <input
                type="number"
                className="form-control"
                value={editCustomerData?.total_order || ""}
                onChange={(e) =>
                  setEditCustomerData({
                    ...editCustomerData,
                    total_order: e.target.value,
                  })
                }
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleEditCustomer}
            >
              Save Changes
            </button>
          </form>
        </Modal.Body>
      </Modal>

      {/* Add Customer Modal */}

      <Modal show={ismodal} onHide={() => setIsmodal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Customer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form>
            <div className="mb-3">
              <label className="form-label">
                Customer Name <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={newCustomer.customer_name}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    customer_name: e.target.value,
                  })
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={newCustomer.email}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    email: e.target.value,
                  })
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">
                Phone <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={newCustomer.phonenumber}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    phonenumber: e.target.value,
                  })
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">State</label>
              <input
                type="text"
                className="form-control"
                value={newCustomer.state}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    state: e.target.value,
                  })
                }
              />
            </div>

            {/* ✅ New created_name field */}
            <div className="mb-3">
              <label className="form-label">
                Created By Name <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={newCustomer.created_name || ""}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    created_name: e.target.value,
                  })
                }
              />
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddCustomer}
            >
              Add Customer
            </button>
          </form>
        </Modal.Body>
      </Modal>



    </div>
  );
}

export default CustomerList;
import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";
import { API_ENDPOINT } from "../../components/api";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import "./OrderList.css"; // Ensure the correct path

const getAuthToken = () => {
  return Cookies.get("jwt_token");
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({
    cart_status: "",
    customer_id: "",
    customer_name: "", // Added customer_name filter
    delivery_address_id: "",
    prescription_id: "",
    phonenumber: "", // Added phone_number filter
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
  });

  const navigate = useNavigate();

  const fetchOrders = async (page = 1) => {
    const token = getAuthToken();
    try {
      const response = await axios.get(`${API_ENDPOINT}view_admin_orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: {
          page,
          per_page: pagination.perPage,
          ...filters,
        },
      });
      setOrders(response.data.orders);
      setPagination((prev) => ({
        ...prev,
        currentPage: response.data.pagination.current_page,
        totalPages: response.data.pagination.total_pages,
      }));
    } catch (error) {
      Swal.fire("Error", "Failed to fetch orders", "error");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filters, pagination.perPage]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleViewClick = (customer) => {
    navigate(`/customer-detail/`, {
      state: { customer_id: customer.customer_id },
    });
  };

  const columns = [
    {
      name: "Cart ID",
      selector: (row) => row.cart_id,
      sortable: true,
    },
    {
      name: "Customer",
      selector: (row) => `${row.customer_name} (${row.customer_id})`,
      sortable: true,
    },
    {
      name: "Phone number",
      selector: (row) => `${row.phonenumber}`,
      sortable: true,
    },
    {
      name: "Created Date",
      selector: (row) => row.cart_created_date,
      sortable: true,
    },
    {
      name: "Updated Date",
      selector: (row) => row.cart_updated_date,
      sortable: true,
    },
    {
      name: "Status",
      selector: (row) => row.cart_status,
      sortable: true,
    },
    {
      name: "Num Products",
      selector: (row) => row.num_products,
      sortable: true,
    },
    {
      name: "Total Value",
      selector: (row) => row.total_cart_value,
      sortable: true,
    },
    {
      name: "Delivery Address",
      selector: (row) => row.delivery_address_selected,
      sortable: true,
    },
    {
      name: "Prescription",
      selector: (row) => row.prescription_selected,
      sortable: true,
    },
    {
      name: "Actions",
      button: true,
      cell: (row) => (
        <button className="btn btn-primary" onClick={() => handleViewClick(row)}>
          View Cart
        </button>
      ),
    },
  ];

  return (
    <div className="order-list-page">
      <h2>Admin Orders</h2>

      {/* Filter Section */}
      <div className="filter-section">
        <label>
          Cart Status:
          <input
            type="text"
            name="cart_status"
            value={filters.cart_status}
            placeholder="Filter by Status"
            onChange={handleFilterChange}
            className="filter-input"
          />
        </label>
        <label>
          Customer Name:
          <input
            type="text"
            name="customer_name"
            value={filters.customer_name}
            placeholder="Filter by Customer Name"
            onChange={handleFilterChange}
            className="filter-input"
          />
        </label>
        <label>
          Mobile number:
          <input
            type="text"
            name="phonenumber"
            value={filters.phonenumber}
            placeholder="Filter by phone number"
            onChange={handleFilterChange}
            className="filter-input"
          />
        </label>
        <label>
          Customer ID:
          <input
            type="text"
            name="customer_id"
            value={filters.customer_id}
            placeholder="Filter by Customer ID"
            onChange={handleFilterChange}
            className="filter-input"
          />
        </label>
        <label>
          Delivery Address ID:
          <input
            type="text"
            name="delivery_address_id"
            value={filters.delivery_address_id}
            placeholder="Filter by Delivery Address"
            onChange={handleFilterChange}
            className="filter-input"
          />
        </label>
        <label>
          Prescription ID:
          <input
            type="text"
            name="prescription_id"
            value={filters.prescription_id}
            placeholder="Filter by Prescription"
            onChange={handleFilterChange}
            className="filter-input"
          />
        </label>
      </div>

      {/* DataTable */}
      <DataTable
        title="Orders"
        columns={columns}
        data={orders}
        pagination
        paginationServer
        paginationTotalRows={pagination.totalPages * pagination.perPage}
        paginationPerPage={pagination.perPage}
        paginationRowsPerPageOptions={[10, 20, 50]}
        onChangeRowsPerPage={(perPage) =>
          setPagination((prev) => ({ ...prev, perPage }))
        }
        onChangePage={(page) => fetchOrders(page)}
      />
    </div>
  );
};

export default AdminOrders;

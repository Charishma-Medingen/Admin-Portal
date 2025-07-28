import React, { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import DataTable from "react-data-table-component";
import { Button } from "react-bootstrap";
import { API_ENDPOINT } from "../../components/api";

export const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState("all");
  const [filters] = useState([
    "all",
    "new_customer",
    "order",
    "prescription_order",
    "payment",
    "product_request"
  ]);

  // Friendly names for the filters
  const filterNames = {
    "all": "All",
    "new_customer": "New Customer",
    "order": "Order",
    "prescription_order": "Prescription Order",
    "payment": "Payment",
    "product_request": "Product Request",
    "all": "All"
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, filter]);  // Fetch notifications on page change or filter change

  const fetchNotifications = async (newFilter = filter, pageNumber = page) => {
    try {
      const token = Cookies.get("jwt_token");
      const response = await axios.get(`${API_ENDPOINT}notifications?page=${pageNumber}&filter=${newFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Replace notifications on filter or page change
      setNotifications(response.data.notifications);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = Cookies.get("jwt_token");
      await axios.put(`${API_ENDPOINT}notifications/${notificationId}/mark-as-read`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications(); // Refresh the list after marking as read
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const openActionUrl = (url) => {
    window.open(url, "_blank");
  };

  const columns = [
    {
      name: "Sender",
      selector: (row) => row.sender,
    },
    {
      name: "Message",
      selector: (row) => row.message,
    },
    {
      name: "Received",
      selector: (row) => new Date(row.date_received).toLocaleString(),
    },
    {
      name: "Actions",
      cell: (row) => (
        <>
          <Button variant="primary" size="sm" onClick={() => openActionUrl(row.action_url)} className="me-2">
            View
          </Button>
          {row.read_status ? (
            <span className="text-muted">Read on {new Date(row.read_status).toLocaleString()}</span>
          ) : (
            <Button variant="success" size="sm" onClick={() => markAsRead(row.id)}>
              Mark as Read
            </Button>
          )}
        </>
      ),
    },
  ];

  const handleFilterClick = (type) => {
    setFilter(type);
    setPage(1);  // Reset page to 1 when a filter is clicked
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Notifications</h2>
      <div className="mb-4">
        {filters.map((type) => (
          <Button
            key={type}
            variant={filter === type ? "primary" : "secondary"}
            className="me-2"
            onClick={() => handleFilterClick(type)}  // Set the filter and reset page to 1
          >
            {filterNames[type]}
          </Button>
        ))}
      </div>
      <DataTable columns={columns} data={notifications} />
      <div className="d-flex justify-content-between mt-4">
        <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Previous
        </Button>
        <span>Page {page} of {totalPages}</span>
        <Button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
};

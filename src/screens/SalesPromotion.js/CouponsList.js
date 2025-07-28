import React, { useState, useEffect } from "react";
import axios from "axios";
import DataTable from "react-data-table-component";
import { Modal, Button, Form } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { API_ENDPOINT } from "../../components/api";
import Swal from "sweetalert2";

function CouponsList() {
  const [coupons, setCoupons] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editCoupon, setEditCoupon] = useState(null);

  // Fetch all coupons
  const fetchCoupons = async () => {
    try {
        Swal.showLoading();
      const res = await axios.get(API_ENDPOINT + "all_coupons");
      setCoupons(res.data.all_coupons);
      Swal.close();
    } catch (err) {
      console.error("Error fetching coupons:", err);
        Swal.fire({
            icon: "error",
            title: "Error fetching coupons",
            showConfirmButton: false,
            timer: 1500,
        });
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // Open modal for editing
  const handleEditClick = (coupon) => {
    setEditCoupon({
      ...coupon,
      available_from_date: formatDate(coupon.available_from_date),
      available_till_date: formatDate(coupon.available_till_date),
    });
    setShowModal(true);
  };

  // Open modal for adding
  const handleAddClick = () => {
    setEditCoupon({
      coupon_code: "",
      coupon_text: "",
      applicable_on_product_ids: "",
      coupon_type: "",
      discount_value: "",
      minimum_order_value: "",
      available_from_date: "",
      available_till_date: "",
      coupon_status: "",
      coupon_usage_limit: "",
    });
    setShowModal(true);
  };

  // Save coupon (add or update)
  const handleSave = async () => {
    try {
        Swal.showLoading();
      if (editCoupon.coupon_id) {
        await axios.put(
          `${API_ENDPOINT}coupon/${editCoupon.coupon_id}`,
          editCoupon
        );
        Swal.fire({
            icon: "success",
            title: "Coupon updated successfully",
            showConfirmButton: false,
            timer: 1500,
            });
      } else {
        await axios.post(`${API_ENDPOINT}coupon`, editCoupon);
        Swal.fire({
            icon: "success",
            title: "Coupon added successfully",
            showConfirmButton: false,
            timer: 1500,
            });
      }
      setShowModal(false);
      fetchCoupons();
    } catch (err) {
      console.error("Error saving coupon:", err);
        Swal.fire({
            icon: "error",
            title: "Error saving coupon",
            showConfirmButton: false,
            timer: 1500,
        });
    }
  };

  // Delete coupon
  const handleDelete = async (coupon_id) => {
    try {
        Swal.showLoading();
      await axios.delete(`${API_ENDPOINT}coupon/${coupon_id}`);
      fetchCoupons();
        Swal.fire({
            icon: "success",
            title: "Coupon deleted successfully",
            showConfirmButton: false,
            timer: 1500,
            });
    } catch (err) {
      console.error("Error deleting coupon:", err);
        Swal.fire({
            icon: "error",
            title: "Error deleting coupon",
            showConfirmButton: false,
            timer: 1500,
        });
    }
  };

  // Define columns for the table
  const columns = [
    { name: "COUPON CODE", selector: (row) => row.coupon_code, sortable: true },
    { name: "TYPE", selector: (row) => row.coupon_type, sortable: true },
    { name: "DISCOUNT", selector: (row) => row.discount_value, sortable: true },
    {
      name: "MIN ORDER",
      selector: (row) => row.minimum_order_value,
      sortable: true,
    },
    {
      name: "START DATE",
      selector: (row) => row.available_from_date,
      sortable: true,
    },
    {
      name: "END DATE",
      selector: (row) => row.available_till_date,
      sortable: true,
    },
    { name: "STATUS", selector: (row) => row.coupon_status, sortable: true },
    {
      name: "ACTIONS",
      cell: (row) => (
        <>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => handleEditClick(row)}
          >
            Edit
          </Button>{" "}
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => handleDelete(row.coupon_id)}
          >
            Delete
          </Button>
        </>
      ),
    },
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = `0${d.getMonth() + 1}`.slice(-2);
    const day = `0${d.getDate()}`.slice(-2);
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="container mt-4">
      <h2>Coupon Management</h2>
      <Button variant="success" className="mb-3" onClick={handleAddClick}>
        Add Coupon
      </Button>

      <DataTable
        columns={columns}
        data={coupons}
        pagination
        highlightOnHover
        striped
      />

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editCoupon?.coupon_id ? "Edit Coupon" : "Add Coupon"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-2">
              <Form.Label>Coupon Code</Form.Label>
              <Form.Control
                type="text"
                value={editCoupon?.coupon_code || ""}
                onChange={(e) =>
                  setEditCoupon({ ...editCoupon, coupon_code: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Coupon Text</Form.Label>
              <Form.Control
                type="text"
                value={editCoupon?.coupon_text || ""}
                onChange={(e) =>
                  setEditCoupon({ ...editCoupon, coupon_text: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>
                Applicable Product IDs (comma-separated), * for all products
              </Form.Label>
              <Form.Control
                type="text"
                value={editCoupon?.applicable_on_product_ids || ""}
                onChange={(e) =>
                  setEditCoupon({
                    ...editCoupon,
                    applicable_on_product_ids: e.target.value,
                  })
                }
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Coupon Type</Form.Label>
              <Form.Select
                value={editCoupon?.coupon_type || ""}
                onChange={(e) =>
                  setEditCoupon({ ...editCoupon, coupon_type: e.target.value })
                }
              >
                <option value="">Select type</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Discount Value</Form.Label>
              <Form.Control
                type="number"
                value={editCoupon?.discount_value || ""}
                onChange={(e) =>
                  setEditCoupon({
                    ...editCoupon,
                    discount_value: e.target.value,
                  })
                }
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Minimum Order Value</Form.Label>
              <Form.Control
                type="number"
                value={editCoupon?.minimum_order_value || ""}
                onChange={(e) =>
                  setEditCoupon({
                    ...editCoupon,
                    minimum_order_value: e.target.value,
                  })
                }
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Available From</Form.Label>
              <Form.Control
                type="date"
                value={editCoupon?.available_from_date || ""}
                onChange={(e) =>
                  setEditCoupon({
                    ...editCoupon,
                    available_from_date: e.target.value,
                  })
                }
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Available Till</Form.Label>
              <Form.Control
                type="date"
                value={editCoupon?.available_till_date || ""}
                onChange={(e) =>
                  setEditCoupon({
                    ...editCoupon,
                    available_till_date: e.target.value,
                  })
                }
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={editCoupon?.coupon_status || ""}
                onChange={(e) =>
                  setEditCoupon({
                    ...editCoupon,
                    coupon_status: e.target.value,
                  })
                }
              >
                <option value="">Select type</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Coupon Usage Limit</Form.Label>
              <Form.Control
                type="number"
                value={editCoupon?.coupon_usage_limit || ""}
                onChange={(e) =>
                  setEditCoupon({
                    ...editCoupon,
                    coupon_usage_limit: e.target.value,
                  })
                }
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {editCoupon?.coupon_id ? "Update Coupon" : "Add Coupon"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default CouponsList;

import React, { useState, useEffect } from "react";
import { Modal, Form } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import PageHeader1 from "../../components/common/PageHeader1";
import Swal from "sweetalert2";
import {
  getAllBlogCategories, // Updated function for fetching blog categories
  addBlogCategory,      // Updated function for adding blog categories
  editBlogCategory,     // Updated function for editing blog categories
  deleteBlogCategory,   // Updated function for deleting blog categories
} from "../../components/api"; // Assume these API functions are defined
import { uploadFile } from "../../components/api"; // Assume this utility is defined

function BlogCategoryList() {
  const [categories, setCategories] = useState([]);
  const [ismodal, setIsmodal] = useState(false);
  const [iseditmodal, setIseditmodal] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10); // Items per page
  const [editCategoryData, setEditCategoryData] = useState(null);
  const [newCategory, setNewCategory] = useState({
    category_name: "",
    category_description: "",
    category_image_url: "",
    category_display_name: "",
    category_on_home: false,
  });
  const [searchtext, setSearchText] = useState("");
  const navigate = useNavigate();

  // Fetch all blog categories from API
  const fetchCategories = async () => {
    try {
      const response = await getAllBlogCategories();
      setCategories(response);
    } catch (error) {
      Swal.fire("Error", "Failed to load categories", "error");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle pagination
  const handlePageChange = (page) => {
    setPage(page);
  };

  // Handle search
  const filteredCategories = categories.filter((category) =>
    category.category_name.toLowerCase().includes(searchtext.toLowerCase()) ||
    category.category_display_name.toLowerCase().includes(searchtext.toLowerCase())
  );

  // Handle Add Blog Category
  const handleAddCategory = async () => {
    // Basic validation
    if (!newCategory.category_name.trim()) {
      Swal.fire("Error", "Category name is required", "error");
      return;
    }
    if (!newCategory.category_description.trim()) {
      Swal.fire("Error", "Category description is required", "error");
      return;
    }
    if (!newCategory.category_display_name.trim()) {
      Swal.fire("Error", "Display name is required", "error");
      return;
    }

    Swal.showLoading();

    try {
      let imageUrl = newCategory.category_image_url;
      if (newCategory.category_image_file) {
        imageUrl = await uploadFile(newCategory.category_image_file, "blogs/images");
      }

      const categoryData = {
        category_name: newCategory.category_name,
        category_description: newCategory.category_description,
        category_image_url: imageUrl,
        category_display_name: newCategory.category_display_name,
        category_on_home: newCategory.category_on_home ? 1 : 0,
      };

      await addBlogCategory(categoryData);
      setIsmodal(false);
      fetchCategories();
      Swal.fire("Success", "Category added successfully", "success");
      setNewCategory({
        category_name: "",
        category_description: "",
        category_image_url: "",
        category_display_name: "",
        category_on_home: false,
      });
    } catch (error) {
      Swal.fire("Error", "Failed to add category", "error");
    }
  };

  // Handle Edit Blog Category
  const handleEditCategory = async () => {
    if (!editCategoryData.category_name.trim()) {
      Swal.fire("Error", "Category name is required", "error");
      return;
    }
    if (!editCategoryData.category_description.trim()) {
      Swal.fire("Error", "Category description is required", "error");
      return;
    }
    if (!editCategoryData.category_display_name.trim()) {
      Swal.fire("Error", "Display name is required", "error");
      return;
    }

    Swal.showLoading();

    try {
      let imageUrl = editCategoryData.category_image_url;
      if (editCategoryData.category_image_file) {
        imageUrl = await uploadFile(editCategoryData.category_image_file, "blogs/images");
      }

      const categoryData = {
        category_name: editCategoryData.category_name,
        category_description: editCategoryData.category_description,
        category_image_url: imageUrl,
        category_display_name: editCategoryData.category_display_name,
        category_on_home: editCategoryData.category_on_home ? 1 : 0,
      };

      await editBlogCategory(editCategoryData.id, categoryData);
      setIseditmodal(false);
      fetchCategories();
      Swal.fire("Success", "Category updated successfully", "success");
      setEditCategoryData(null);
    } catch (error) {
      Swal.fire("Error", "Failed to update category", "error");
    }
  };

  // Handle Delete Blog Category
  const handleDeleteCategory = async (category_id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.showLoading();
        try {
          await deleteBlogCategory(category_id);
          fetchCategories();
          Swal.fire("Deleted!", "Category has been deleted.", "success");
        } catch (error) {
          Swal.fire("Error", "Failed to delete category", "error");
        }
      }
    });
  };

  // Define columns for DataTable
  const columns = [
    {
      name: "ID",
      selector: (row) => row.id,
      sortable: true,
      width: "80px",
    },
    {
      name: "IMAGE",
      selector: (row) => row.category_image_url,
      cell: (row) => (
        <img
          src={`https://d26lh6sqkii1nb.cloudfront.net/blogs/images/${row.category_image_url}`}
          alt={row.category_name}
          style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "50%" }}
        />
      ),
      sortable: false,
      width: "80px",
    },
    {
      name: "NAME",
      selector: (row) => row.category_name,
      sortable: true,
    },
    {
      name: "DESCRIPTION",
      selector: (row) => row.category_description,
      sortable: false,
      wrap: true,
    },
    {
      name: "DISPLAY NAME",
      selector: (row) => row.category_display_name,
      sortable: true,
    },
    {
      name: "SHOW ON HOME",
      selector: (row) => row.category_on_home,
      sortable: true,
    },
    {
      name: "ACTIONS",
      cell: (row) => (
        <>
          <button
            onClick={() => handleEditClick(row)}
            className="btn btn-sm btn-primary me-2"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteCategory(row.id)}
            className="btn btn-sm btn-danger"
          >
            Delete
          </button>
        </>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
      width: "150px",
    },
  ];

  const handleEditClick = (category) => {
    setEditCategoryData({ ...category });
    setIseditmodal(true);
  };

  return (
    <div className="body d-flex py-lg-3 py-md-2">
      <div className="container-xxl">
        <PageHeader1
          pagetitle="Blog Categories Management"
          modalbutton={() => (
            <div className="col-auto d-flex w-sm-100">
              <button
                type="button"
                onClick={() => setIsmodal(true)}
                className="btn btn-primary btn-set-task w-sm-100"
              >
                <i className="icofont-plus-circle me-2 fs-6"></i>Add Category
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
              placeholder="Search categories..."
              value={searchtext}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1); // Reset to first page on search
              }}
            />
          </div>
        </div>

        <div className="row clearfix g-3">
          <div className="col-sm-12">
            <div className="card mb-3">
              <div className="card-body">
                <DataTable
                  columns={columns}
                  data={filteredCategories}
                  pagination
                  paginationTotalRows={filteredCategories.length}
                  paginationPerPage={perPage}
                  onChangePage={handlePageChange}
                  paginationServer={false}
                  highlightOnHover={true}
                  responsive
                  defaultSortFieldId={1}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Category Modal */}
      <Modal show={iseditmodal} onHide={() => setIseditmodal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Category</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editCategoryData && (
            <Form>
              <div className="mb-3">
                <Form.Label>Category Name</Form.Label>
                <Form.Control
                  type="text"
                  value={editCategoryData.category_name}
                  onChange={(e) =>
                    setEditCategoryData({
                      ...editCategoryData,
                      category_name: e.target.value,
                    })
                  }
                />
              </div>
              <div className="mb-3">
                <Form.Label>Category Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editCategoryData.category_description}
                  onChange={(e) =>
                    setEditCategoryData({
                      ...editCategoryData,
                      category_description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="mb-3">
                <Form.Label>Display Name</Form.Label>
                <Form.Control
                  type="text"
                  value={editCategoryData.category_display_name}
                  onChange={(e) =>
                    setEditCategoryData({
                      ...editCategoryData,
                      category_display_name: e.target.value,
                    })
                  }
                />
              </div>
              <Form.Group className="mb-3">
                <Form.Label>Show on Home (Order)</Form.Label>
                <Form.Control
                  type="number"
                  value={editCategoryData?.category_on_home}
                  onChange={(e) => setEditCategoryData({ ...editCategoryData, category_on_home: e.target.value })}
                />
              </Form.Group>
              <div className="mb-3">
                <Form.Label>Category Image</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setEditCategoryData({
                      ...editCategoryData,
                      category_image_file: e.target.files[0],
                    })
                  }
                />
                {editCategoryData.category_image_url && (
                  <img
                    src={`https://d26lh6sqkii1nb.cloudfront.net/blogs/images/${editCategoryData.category_image_url}`}
                    alt={editCategoryData.category_name}
                    style={{
                      width: "100px",
                      height: "100px",
                      objectFit: "cover",
                      marginTop: "10px",
                    }}
                  />
                )}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleEditCategory}
              >
                Save Changes
              </button>
            </Form>
          )}
        </Modal.Body>
      </Modal>

      {/* Add Category Modal */}
      <Modal show={ismodal} onHide={() => setIsmodal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Category</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <div className="mb-3">
              <Form.Label>Category Name</Form.Label>
              <Form.Control
                type="text"
                value={newCategory.category_name}
                onChange={(e) =>
                  setNewCategory({
                    ...newCategory,
                    category_name: e.target.value,
                  })
                }
              />
            </div>
            <div className="mb-3">
              <Form.Label>Category Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newCategory.category_description}
                onChange={(e) =>
                  setNewCategory({
                    ...newCategory,
                    category_description: e.target.value,
                  })
                }
              />
            </div>
            <div className="mb-3">
              <Form.Label>Display Name</Form.Label>
              <Form.Control
                type="text"
                value={newCategory.category_display_name}
                onChange={(e) =>
                  setNewCategory({
                    ...newCategory,
                    category_display_name: e.target.value,
                  })
                }
              />
            </div>
            <Form.Group className="mb-3">
              <Form.Label>Show on Home (Order)</Form.Label>
              <Form.Control
                type="number"
                value={newCategory.category_on_home}
                onChange={(e) => setNewCategory({ ...newCategory, category_on_home: e.target.value })}
              />
            </Form.Group>
            <div className="mb-3">
              <Form.Label>Category Image</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setNewCategory({
                    ...newCategory,
                    category_image_file: e.target.files[0],
                  })
                }
              />
              {newCategory.category_image_url && (
                <img
                  src={`https://d26lh6sqkii1nb.cloudfront.net/blogs/images/${newCategory.category_image_url}`}
                  alt={newCategory.category_name}
                  style={{
                    width: "100px",
                    height: "100px",
                    objectFit: "cover",
                    marginTop: "10px",
                  }}
                />
              )}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddCategory}
            >
              Add Category
            </button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default BlogCategoryList;

import React, { useState, useEffect } from "react";
import { Modal, Form, Dropdown } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import PageHeader1 from "../../components/common/PageHeader1";
import Swal from "sweetalert2";
import "./Blogs.css";
import {
  getAllBlogs,
  addBlog,
  editBlog,
  deleteBlog,
  fetchBlogHtml,
  getAllBlogCategories, // Assuming the function is defined to fetch categories
} from "../../components/api";
import { uploadFile } from "../../components/api"; // Assuming this utility is defined
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import VisibilityStatus from "../../components/Products/ProductAdd/VisibilityStatus";

class Base64UploadAdapter {
  constructor(loader) {
    this.loader = loader; // The file loader instance to use during the upload
  }

  upload() {
    return this.loader.file.then((file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          resolve({ default: reader.result }); // `default` is the key CKEditor expects
        };

        reader.onerror = (err) => reject(err);

        reader.readAsDataURL(file); // Convert the file to a Base64 string
      });
    });
  }

  abort() {
    // Handle any abort logic if necessary
  }
}

const Blogs = () => {
  const [tableData, setTableData] = useState([]);
  const [isAddModal, setIsAddModal] = useState(false);
  const [isEditModal, setIsEditModal] = useState(false);
  const [blogData, setBlogData] = useState(null);
  const [newBlog, setNewBlog] = useState({
    blog_name: "",
    blog_image_url: "",
    blog_category_id: "",
    blog_description_url: "",
    blog_visit_count: 0,
    blog_rc_priority: "",
    blog_created_date: "", // Add new field for created date
    blog_url: "", // Add new field for blog URL
    meta_keywords: "", // Add new field for meta keywords
    visibility_status: "Published"
  });
  const [categories, setCategories] = useState([]);
  const [searchText, setSearchText] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchBlogs();
    fetchCategories();
  }, []);

  const fetchBlogs = async () => {
    try {
      Swal.showLoading();
      const response = await getAllBlogs();
      setTableData(response);
      Swal.close();
    } catch (error) {
      Swal.fire("Error", "Failed to load blogs", "error");
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await getAllBlogCategories();
      const resp_cat = response.map((cat) => ({
        blog_category_id: cat.id,
        name: cat.category_name,
      }));
      setCategories(resp_cat);
    } catch (error) {
      Swal.fire("Error", "Failed to load blog categories", "error");
    }
  };

  const handleAddBlog = async () => {
    try {
      if (newBlog.blog_description_url) {
        const blob = new Blob([newBlog.blog_description_url], {
          type: "text/html",
        });
        const file = new File([blob], "description.html", {
          type: "text/html",
        });
        const fileUrl = await uploadFile(file, "blogs/description");
        newBlog.blog_description_url = fileUrl;
      }

      await addBlog(newBlog);
      setIsAddModal(false);
      fetchBlogs();
      Swal.fire("Success", "Blog added successfully", "success");
    } catch (error) {
      Swal.fire("Error", "Failed to add blog", "error");
    }
  };

  const handleEditBlog = async (applyall = false) => {
    try {
      if (!blogData) return;

      Swal.showLoading();
      if (blogData.blog_description_url) {
        const blob = new Blob([blogData.blog_description_url], {
          type: "text/html",
        });
        const file = new File([blob], "description.html", {
          type: "text/html",
        });
        const fileUrl = await uploadFile(file, "blogs/description");
        blogData.blog_description_url = fileUrl;
        blogData.applyall = applyall;
      }

      await editBlog(blogData.id, blogData);
      setIsEditModal(false);
      fetchBlogs();
      Swal.fire("Success", "Blog updated successfully", "success");
    } catch (error) {
      Swal.fire("Error", "Failed to update blog", "error");
    }
  };

  const handleDeleteBlog = async (id) => {
    const confirmed = await Swal.fire({
      title: "Are you sure?",
      text: "This will delete the blog.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });

    if (confirmed.isConfirmed) {
      await deleteBlog(id);
      fetchBlogs();
      Swal.fire("Deleted", "Blog deleted successfully", "success");
    }
  };

  const filteredData = tableData.filter(
    (item) =>
      item.blog_name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.blog_category_id.toLowerCase().includes(searchText.toLowerCase()) ||
      item.blog_rc_priority.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      name: "ID",
      selector: (row) => row.id,
      sortable: true,
    },
    {
      name: "Blog Name",
      selector: (row) => row.blog_name,
      sortable: true,
    },
    {
      name: "Category",
      selector: (row) =>
        categories.find((cat) => cat.blog_category_id === row.blog_category_id)
          ?.name,
      sortable: true,
    },
    {
      name: "Visit Count",
      selector: (row) => row.blog_visit_count,
      sortable: true,
    },
    {
      name: "Created Date",
      selector: (row) => row.blog_created_date,
      sortable: true,
    },
    {
      name: "Priority",
      selector: (row) => row.blog_rc_priority,
      sortable: true,
    },
    {
      name: "Description URL",
      selector: (row) => row.blog_description_url,
      cell: (row) => (
        <a
          href={
            "https://d26lh6sqkii1nb.cloudfront.net/blogs/description/" +
            row.blog_description_url
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          View
        </a>
      ),
      sortable: false,
    },
    {
      name: "Image",
      selector: (row) => row.blog_image_url,
      cell: (row) => (
        <img
          src={
            "https://d26lh6sqkii1nb.cloudfront.net/blogs/images/" +
            row.blog_image_url
          }
          alt="Blog"
          style={{ width: "50px", height: "50px" }}
        />
      ),
      sortable: false,
    },
    {
      name: "Actions",
      cell: (row) => (
        <>
          <div>
            <button
              onClick={async () => {
                const htmlContent = await fetchBlogHtml(
                  row.blog_description_url
                );
                setBlogData({ ...row, blog_description_url: htmlContent });
                setIsEditModal(true);
              }}
              className="btn btn-outline-primary"
            >
              Edit
            </button>
            <br />
            <br />
            <button
              onClick={() => handleDeleteBlog(row.id)}
              className="btn btn-outline-danger"
            >
              Delete
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
          pagetitle="Blogs"
          modalbutton={() => (
            <div className="col-auto d-flex w-sm-100">
              <button
                type="button"
                onClick={() => setIsAddModal(true)}
                className="btn btn-primary btn-set-task w-sm-100"
              >
                <i className="icofont-plus-circle me-2 fs-6"></i>Add Blog
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
              placeholder="Search blogs..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>

        <div className="row clearfix g-3">
          <div className="col-sm-12">
            <div className="card mb-3">
              <div className="card-body">
                <DataTable
                  columns={columns}
                  data={filteredData}
                  pagination
                  highlightOnHover={true}
                  pointerOnHover={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Blog Modal */}
      <Modal show={isAddModal} onHide={() => setIsAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Blog</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
          <Form.Group>
          <VisibilityStatus visibilityStatus={newBlog?.visibility_status} handleVisibilityChange={(e) =>
                  setNewBlog({ ...newBlog, visibility_status: e.target.value })
                }/>
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Blog Name</Form.Label>
              <Form.Control
                type="text"
                value={newBlog.blog_name}
                onChange={(e) =>
                  setNewBlog({ ...newBlog, blog_name: e.target.value })
                }
              />
            </Form.Group>
            <br />

            <Form.Group>
              <Form.Label>Blog URL</Form.Label>
              <Form.Control
                type="text"
                value={newBlog?.blog_url || ""}
                onChange={(e) =>
                  setNewBlog({ ...newBlog, blog_url: e.target.value })
                }
              />
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Meta Title</Form.Label>
              <Form.Control
                type="text"
                value={newBlog?.meta_title || ""}
                onChange={(e) =>
                  setNewBlog({ ...newBlog, meta_title: e.target.value })
                }
              />
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Meta Description</Form.Label>
              <Form.Control
                type="text"
                value={newBlog?.meta_description || ""}
                onChange={(e) =>
                  setNewBlog({ ...newBlog, meta_description: e.target.value })
                }
              />
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Meta Keywords</Form.Label>
              <Form.Control
                type="text"
                value={newBlog?.meta_keywords || ""}
                onChange={(e) =>
                  setNewBlog({ ...newBlog, meta_keywords: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Author</Form.Label>
              <Form.Control
                type="text"
                value={newBlog?.meta_author || ""}
                onChange={(e) =>
                  setNewBlog({ ...newBlog, meta_author: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Author Job title</Form.Label>
              <Form.Control
                type="text"
                value={newBlog?.meta_author_title || ""}
                onChange={(e) =>
                  setNewBlog({ ...newBlog, meta_author_title: e.target.value })
                }
              />
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Author Profile URL</Form.Label>
              <Form.Control
                type="text"
                value={newBlog?.meta_author_profile_url || ""}
                onChange={(e) =>
                  setNewBlog({ ...newBlog, meta_author_profile_url: e.target.value })
                }
              />
            </Form.Group>
            <br/>
            <Form.Group>
              <Form.Label>Blog Category</Form.Label>
              <Form.Control
                as="select"
                value={newBlog.blog_category_id}
                onChange={(e) =>
                  setNewBlog({ ...newBlog, blog_category_id: e.target.value })
                }
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option
                    key={category.blog_category_id}
                    value={category.blog_category_id}
                  >
                    {category.name}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Blog Image</Form.Label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  const fileUrl = await uploadFile(file, "blogs/images");
                  setNewBlog({ ...newBlog, blog_image_url: fileUrl });
                }}
              />
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <CKEditor
                editor={ClassicEditor}
                data={newBlog.blog_description_url || ""}
                onChange={(event, editor) => {
                  const data = editor.getData();
                  setNewBlog({ ...newBlog, blog_description_url: data });
                }}
                config={{
                  height: 700,
                  toolbar: [
                    "heading",
                    "|",
                    "bold",
                    "italic",
                    "link",
                    "bulletedList",
                    "numberedList",
                    "|",
                    "alignment", // Alignment option
                    "fontFamily", // Font family selection
                    "fontSize", // Font size selection
                    "|",
                    "blockQuote",
                    "insertTable",
                    "|",
                    "imageUpload",
                    "imageTextAlternative", // For image alt text
                    "undo",
                    "redo",
                  ],
                  image: {
                    toolbar: [
                      "imageTextAlternative",
                      "imageStyle:full",
                      "imageStyle:side", // Allow styling images
                    ],
                  },

                  extraPlugins: [
                    function CustomBase64UploadAdapterPlugin(editor) {
                      editor.plugins.get("FileRepository").createUploadAdapter =
                        (loader) => {
                          return new Base64UploadAdapter(loader);
                        };
                    },
                  ],
                  alignment: {
                    options: ["left", "center", "right", "justify"], // Available alignment options
                  },
                }}
              />
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Blog Priority</Form.Label>
              <Form.Control
                type="number"
                value={newBlog.blog_rc_priority}
                onChange={(e) =>
                  setNewBlog({ ...newBlog, blog_rc_priority: e.target.value })
                }
              />
            </Form.Group>
            <br />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddBlog}
            >
              Add Blog
            </button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Edit Blog Modal */}
      <Modal show={isEditModal} onHide={() => setIsEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Blog</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
          <Form.Group>
          <VisibilityStatus visibilityStatus={blogData?.visibility_status} handleVisibilityChange={(e) =>
                  setBlogData({ ...blogData, visibility_status: e.target.value })
                }/>
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Blog Name</Form.Label>
              <Form.Control
                type="text"
                value={blogData?.blog_name || ""}
                onChange={(e) =>
                  setBlogData({ ...blogData, blog_name: e.target.value })
                }
              />
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Meta Title</Form.Label>
              <Form.Control
                type="text"
                value={blogData?.meta_title || ""}
                onChange={(e) =>
                  setBlogData({ ...blogData, meta_title: e.target.value })
                }
              />
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Meta Description</Form.Label>
              <Form.Control
                type="text"
                value={blogData?.meta_description || ""}
                onChange={(e) =>
                  setBlogData({ ...blogData, meta_description: e.target.value })
                }
              />
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Meta Keywords</Form.Label>
              <Form.Control
                type="text"
                value={blogData?.meta_keywords || ""}
                onChange={(e) =>
                  setBlogData({ ...blogData, meta_keywords: e.target.value })
                }
              />
            </Form.Group>
            <br/>
            <Form.Group>
              <Form.Label>Author</Form.Label>
              <Form.Control
                type="text"
                value={blogData?.meta_author || ""}
                onChange={(e) =>
                  setBlogData({ ...blogData, meta_author: e.target.value })
                }
              />
            </Form.Group>
            <br/>
            <Form.Group>
              <Form.Label>Author Job title</Form.Label>
              <Form.Control
                type="text"
                value={blogData?.meta_author_title || ""}
                onChange={(e) =>
                  setBlogData({ ...blogData, meta_author_title: e.target.value })
                }
              />
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Author Profile URL</Form.Label>
              <Form.Control
                type="text"
                value={blogData?.meta_author_profile_url || ""}
                onChange={(e) =>
                  setBlogData({ ...blogData, meta_author_profile_url: e.target.value })
                }
              />
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Blog URL</Form.Label>
              <Form.Control
                type="text"
                value={blogData?.blog_url || ""}
                onChange={(e) =>
                  setBlogData({ ...blogData, blog_url: e.target.value })
                }
              />
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Blog Category</Form.Label>
              <Form.Control
                as="select"
                value={blogData?.blog_category_id || 0}
                onChange={(e) =>
                  setBlogData({ ...blogData, blog_category_id: e.target.value })
                }
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option
                    key={category.blog_category_id}
                    value={category.blog_category_id}
                  >
                    {category.name}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Blog Image</Form.Label>
              <br />
              <br />
              <img
                src={
                  "https://d26lh6sqkii1nb.cloudfront.net/blogs/images/" +
                  (blogData?.blog_image_url || "")
                }
                alt="Blog"
                style={{ width: "auto", height: "200px" }}
              />
              <br />
              <br />
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  const fileUrl = await uploadFile(file, "blogs/images");
                  setBlogData({ ...blogData, blog_image_url: fileUrl });
                }}
              />
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <CKEditor
                editor={ClassicEditor}
                data={blogData?.blog_description_url || ""}
                onChange={(event, editor) => {
                  const data = editor.getData();
                  setBlogData({ ...blogData, blog_description_url: data });
                }}
                config={{
                  height: 700,
                  toolbar: [
                    "heading",
                    "|",
                    "bold",
                    "italic",
                    "link",
                    "bulletedList",
                    "numberedList",
                    "|",
                    "alignment", // Alignment option
                    "fontFamily", // Font family selection
                    "fontSize", // Font size selection
                    "|",
                    "blockQuote",
                    "insertTable",
                    "|",
                    "imageUpload",
                    "imageTextAlternative", // For image alt text
                    "undo",
                    "redo",
                  ],
                  image: {
                    toolbar: [
                      "imageTextAlternative",
                      "imageStyle:full",
                      "imageStyle:side", // Allow styling images
                    ],
                  },

                  extraPlugins: [
                    function CustomBase64UploadAdapterPlugin(editor) {
                      editor.plugins.get("FileRepository").createUploadAdapter =
                        (loader) => {
                          return new Base64UploadAdapter(loader);
                        };
                    },
                  ],
                  alignment: {
                    options: ["left", "center", "right", "justify"], // Available alignment options
                  },
                }}
              />
            </Form.Group>
            <br />
            <Form.Group>
              <Form.Label>Blog Priority</Form.Label>
              <Form.Control
                type="number"
                value={blogData?.blog_rc_priority || 0}
                onChange={(e) =>
                  setBlogData({ ...blogData, blog_rc_priority: e.target.value })
                }
              />
            </Form.Group>
            <br />
            Blog created date: {blogData?.blog_created_date}
            <br />
            <br />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleEditBlog(false)}
            >
              Update Blog
            </button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Blogs;

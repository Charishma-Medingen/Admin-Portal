import React, { useState, useEffect } from 'react';
import CardBlock from '../../components/Products/ProductList/CardBlock';
import PageHeader1 from '../../components/common/PageHeader1';
import DemoQueryBuilder from '../../components/Products/ProductList/ProductFilter';
import { Utils as QbUtils } from '@react-awesome-query-builder/antd';
import {getProductList, getUploadStatus, uploadFile} from '../../components/api.js';
import "./style.css"

// import css antd
import 'antd/dist/reset.css'; // Ant Design styles (for antd v5+)
import '@react-awesome-query-builder/antd/css/styles.css';
import "antd/dist/antd.js"

import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
const MySwal = withReactContent(Swal);

const ProductStatusTable = () => {
  const [productStatus, setProductStatus] = useState([]);
  const [error, setError] = useState(null);

  const fetchProductStatus = async () => {
    try {
      const response = await getUploadStatus();
      setProductStatus(response);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch product status.");
    }
  };

  useEffect(() => {
    fetchProductStatus();
  }, []);

  return (
    <div className='product_status'>
      <h4>Product Upload Status</h4>
      {error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <table border="1" style={{ width: "100%", borderCollapse: "collapse", marginBottom: "50px" }}>
          <thead>
            <tr>
              <th>Created By</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {productStatus.map((item, index) => (
              <tr key={index}>
                <td>{item.created_by}</td>
                <td>{item["COUNT(created_by)"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const RedirectUploader = () => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleFileChange = async (event) => {
    setError(null);
    setSuccess(null);

    const file = event.target.files[0];

    if (!file) return;

    if (file.type !== 'text/csv') {
      setError('Only CSV files are allowed.');
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const lines = text.trim().split('\n');

        if (lines.length < 2) {
          setError('CSV must have at least one row after header.');
          return;
        }

        const redirectMap = {};

        for (let i = 1; i < lines.length; i++) {
          const [oldUrl, newUrl] = lines[i].split(',').map(s => s.trim());
          if (!oldUrl || !newUrl) continue;
          redirectMap[oldUrl] = newUrl;
        }

        const blob = new Blob([JSON.stringify(redirectMap, null, 2)], {
          type: 'application/json',
        });

        const jsonFile = new File([blob], 'redirect_map.json', {
          type: 'application/json',
        });

        const fileUrl = await uploadFile(jsonFile, 'redirects', false);

        setSuccess(`Redirect map uploaded successfully! File URL: ${fileUrl}`);
      } catch (err) {
        console.error(err);
        setError('Failed to parse or upload the file.');
      }
    };

    reader.onerror = () => {
      setError('Error reading the file.');
    };

    reader.readAsText(file);
  };

  return (
    <div className='redirect_uploader'>
      <h4>Upload Redirect CSV for /products /blog and /blogs </h4>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </div>
  );
};


function ProductList() {
    const [currentPage, setCurrentPage] = useState(1);
    const [resultsData, setResultsData] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [tree, setTree] = useState(null); // Query tree
    const [config, setConfig] = useState({}); // Query configuration
    const [searchText, setSearchText] = useState(''); // Search text
    const [isSearchClicked, setIsSearchClicked] = useState(false); // Track if search is clicked

    
 

    const search = async (q) => {
    
        // Show loading spinner
        MySwal.fire({
            title: 'Loading',
            text: 'Please wait ...',
            allowOutsideClick: false,
            didOpen: () => {
                MySwal.showLoading();
            }
        });
    
        try {
            const response = await getProductList(q.page, q.query, q.text);
            setResultsData(response.results);
            setTotalPages(response.total_pages);
            setCurrentPage(1); // Reset to first page
        } catch (error) {
            console.error("Error fetching data:", error);
            MySwal.fire({
                icon: 'error',
                title: 'Error',
                text: 'There was an error fetching the data. Please try again later.'
            });
        } finally {
            // Close the loading spinner
            MySwal.close();
        }

    };
    

    // Function to fetch data based on page number, query, or search text
    const fetchData = async (page, immutableTree, queryConfig = null) => {
        const sqlQuery = "";
        try {
            const query = QbUtils.sqlFormat(immutableTree, queryConfig);
            search({ page, query: query, text: searchText });
        } catch (error) {
            console.error("Error fetching data:", error);
            search({ page, query: sqlQuery, text: searchText });
        }
        
    };


    // useEffect to fetch data when currentPage changes and search is clicked
    useEffect(() => {
        if (isSearchClicked) {
            fetchData(currentPage, tree, config);
            setIsSearchClicked(false); // Reset the search clicked state
        }
    }, [currentPage, isSearchClicked]);

    // Search handler functions
    const handleSearch = () => {
        handleTextSearch();
    };

    const handleTextSearch = () => {
        setSearchText(document.querySelector('input[type="search"]').value);
        setIsSearchClicked(true);
    };

  // Pagination handler functions
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prevPage => prevPage - 1);
    }
  };

  const getPaginationLinks = () => {
    const links = [];
    const range = 5; // Number of pages to show before and after the current page

    let startPage = Math.max(1, currentPage - range);
    let endPage = Math.min(totalPages, currentPage + range);

    // Adjust startPage and endPage if near the beginning or end
    if (currentPage - range <= 1) {
      endPage = Math.min(totalPages, endPage + (range - (currentPage - 1)));
      startPage = 1;
    }

    if (currentPage + range >= totalPages) {
      startPage = Math.max(1, startPage - (currentPage + range - totalPages));
      endPage = totalPages;
    }

    // Add "..." before the startPage if necessary
    if (startPage > 2) {
      links.push(
        <li key="start-ellipsis" className="page-item disabled">
          <span className="page-link">...</span>
        </li>
      );
      // Always add the first page number
      links.push(
        <li key={1} className={`page-item ${currentPage === 1 ? 'active' : ''}`} aria-current={currentPage === 1 ? 'page' : undefined}>
          <a className="page-link" href="#!" onClick={() => { setCurrentPage(1); handleSearch(); }}>{1}</a>
        </li>
      );
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      links.push(
        <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`} aria-current={currentPage === i ? 'page' : undefined}>
          <a className="page-link" href="#!" onClick={() => { setCurrentPage(i); handleSearch(); }}>{i}</a>
        </li>
      );
    }

    // Add "..." after the endPage if necessary
    if (endPage < totalPages - 1) {
      links.push(
        <li key="end-ellipsis" className="page-item disabled">
          <span className="page-link">...</span>
        </li>
      );
      // Always add the last page number
      links.push(
        <li key={totalPages} className={`page-item ${currentPage === totalPages ? 'active' : ''}`} aria-current={currentPage === totalPages ? 'page' : undefined}>
          <a className="page-link" href="#!" onClick={() => { setCurrentPage(totalPages); handleSearch(); }}>{totalPages}</a>
        </li>
      );
    }

    return links;
  };

  const paginationLinks = getPaginationLinks();


    // Handler to update query and config from DemoQueryBuilder
    const handleQueryChange = (updatedTree, updatedConfig) => {
        setTree(updatedTree);
        setConfig(updatedConfig);
    };


    return (
        <div className="container-xxl">
          <PageHeader1 pagetitle='Products' productlist={true} />
          <div className="input-group flex-nowrap input-group-lg">
            <input type="search" className="form-control" placeholder="Search" />
            <button type="button" className="input-group-text" id="addon-wrapping" onClick={handleTextSearch}>
              <i className="fa fa-search"></i>
            </button>
          </div>
          <br />
    
          <div className='row'>
            <div className="card mb-3">
              <div className="reset-block">
                <div className="filter-title">
                  <h4 className="title">Filter</h4>
                </div>
                <div className="filter-btn">
                  <a className="btn btn-primary" href="#!" onClick={handleSearch}>Search</a>
                </div>
              </div>
              <div className="row">
                <DemoQueryBuilder onQueryChange={handleQueryChange} />
              </div>
            </div>
          </div>
    
          <div className="row g-3 mb-3">
            <div className="col-md-12 col-lg-12 col-xl-12 col-xxl-12">
              <CardBlock resultsData={resultsData} />
            </div>
            <div className="row g-3 mb-3">
              <div className="col-md-12">
                <nav className="justify-content-end d-flex">
                  <ul className="pagination">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <a className="page-link" href="#!" onClick={() => { handlePreviousPage(); handleSearch(); }}>Previous</a>
                    </li>
                    {paginationLinks}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <a className="page-link" href="#!" onClick={() => { handleNextPage(); handleSearch(); }}>Next</a>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
          <ProductStatusTable />
        <RedirectUploader/>
        </div>
      );
    }
        
    export default ProductList;
    
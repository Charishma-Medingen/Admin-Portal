import React from 'react';
import { Route, Routes as ReactRoutes, useNavigate } from "react-router-dom";
import Swal from 'sweetalert2'; // Import SweetAlert2
import Dashboard from './Dashboard/Dashboard';
import ProductGrid from './Products/ProductGrid';
import ProductList from './Products/ProductList';
import ProductEdit from './Products/ProductEdit';
import ProductDetail from './Products/ProductDetail';
import ProductAdd from './Products/ProductAdd';
import ShoppingCart from './Products/ShoppingCart';
import Header from '../components/common/Header';
import CheckOut from './Products/CheckOut';
import CategoriesList from './Categories/CategoriesList';
import OrderList from './Orders/OrderList';
import OrderDetail from './Orders/OrderDetail';
import OrderInvoice from './Orders/OrderInvoice';
import CustomerList from './Customers/CustomerList';
import CustomerDetail from './Customers/CustomerDetail';
import CustomerNotifications from './Customers/CustomerNotifications';
import CouponsList from './SalesPromotion.js/CouponsList';
import CouponsAdd from './SalesPromotion.js/CouponsAdd';
import CouponsEdit from './SalesPromotion.js/CouponsEdit';
import StockList from './Inventory/StockList';
import Purchase from './Inventory/Purchase';
import Supplier from './Inventory/Supplier';
import Return from './Inventory/Return';
import Departments from './Inventory/Departments';
import Invoices from './Accounts/Invoices';
import Expense from './Accounts/Expense';
import Salaryslip from './Accounts/Salaryslip';
import Chat from './App/Chat';
import ProfilePage from './Other Pages/ProfilePage'
import PricePlanExample from './Other Pages/PricePlanExample';
import ContactUs from './Other Pages/ContactUs';
import Icons from './Other Pages/Icon';
import FormsExample from './Other Pages/FormsExample';
import TableExample from './Other Pages/TableExample';
import ChartsExample from './Other Pages/ChartsExample';
import Alerts from './Uicomponent/Alerts';
import Badges from './Uicomponent/Badge';
import Breadcrumb from './Uicomponent/Breadcrumb';
import Buttons from './Uicomponent/Buttons';
import Cards from './Uicomponent/Card';
import Carousel from './Uicomponent/Carousel';
import Collapse from './Uicomponent/Collapse';
import Dropdowns from './Uicomponent/Dropdowns';
import ListGroup from './Uicomponent/ListGroup';
import ModalUI from './Uicomponent/Modal';
import NavbarUI from './Uicomponent/Navbar';
import NavsUI from './Uicomponent/Navs';
import PaginationUI from './Uicomponent/Pagination';
import PopoversUI from './Uicomponent/Popovers';
import ProgressUI from './Uicomponent/Progress';
import Scrollspy from './Uicomponent/Scrollspy';
import SpinnersUI from './Uicomponent/Spinners';
import ToastsUI from './Uicomponent/Toasts';
import Calendar from './App/Calendar';
import StaterPage from './Stater Page/StaterPage';
import Documentation from './Documentation/Documentation';
import Changelog from './Changelog/Changelog';
import CategoriesEdit from './Categories/CategoriesEdit';
import CategoriesAdd from './Categories/CategoriesAdd';
import StoreLocation from './StoreLocation/Storelocation';
import Help from './Help/Help';
import SimpleInvoice from '../components/Accounts/Invoice/SimpleInvoice';
import CompositionCode from './Products/CompositionCode';
import BlogCategoryList from './Blogs/BlogsCategories';
import Blogs from './Blogs/Blogs';
import AdminOrders from './Orders/OrderList';
import { Notifications } from './Notifications/Notifications';

function MainIndex(props) {
  const { activekey } = props;
  const navigate = useNavigate(); // Hook to navigate programmatically

  // Function to show alert and navigate back to home
  function NotFound() {
    const navigate = useNavigate();

    React.useEffect(() => {
        Swal.fire({
            title: 'Error 404',
            text: 'The page you are looking for does not exist.',
            icon: 'error',
            confirmButtonText: 'Go to Products'
        }).then(() => {
            navigate("/sign-in"); // Redirect to dashboard or another page
        });
    }, [navigate]);

    return null; // No need to render anything
}


  return (

    <div className='main px-lg-4 px-md-4' >
    {activekey === "/chat" ? "" : <Header />}
    <div className="body d-flex py-3 ">
        <ReactRoutes>
            <Route exact path={"/"} element={<Dashboard />} />
            <Route exact path={"/dashboard"} element={<Dashboard />} />
            <Route exact path={'/notifications-list'} element={<Notifications />} />
            <Route exact path={'/product-grid'} element={<ProductGrid />} />
            <Route exact path={'/product-list'} element={<ProductList />} />
            <Route path={'/composition-code'} element={<CompositionCode />} />
            <Route path={'/product-edit/:product_id'} element={<ProductEdit />} />
            <Route exact path={'/product-detail'} element={<ProductDetail />} />
            <Route exact path={'/product-Add'} element={<ProductAdd />} />
            <Route exact path={'/shopping-cart'} element={<ShoppingCart />} />
            <Route exact path={'/check-out'} element={<CheckOut />} />
            <Route exact path={'/categories-list'} element={<CategoriesList />} />
            <Route exact path={'/categories-edit'} element={<CategoriesEdit />} />
            <Route exact path={'/categories-add'} element={<CategoriesAdd />} />
            <Route exact path={'/orders-list'} element={<AdminOrders />} />
            <Route exact path={'/order-detail'} element={<OrderDetail />} />
            <Route exact path={'/order-invoice'} element={<OrderInvoice />} />
            <Route exact path={'/customer-list'} element={<CustomerList />} />
            <Route exact path={'/customer-detail'} element={<CustomerDetail />} />
            <Route exact path="/customer_detail/:id" element={<CustomerDetail />} />
            <Route exact path={'/customer-notifications'} element={<CustomerNotifications />} />
            <Route exact path={'/coupons-list'} element={<CouponsList />} />
            <Route exact path={'/coupons-add'} element={<CouponsAdd />} />
            <Route exact path={'/coupons-edit'} element={<CouponsEdit />} />
            <Route exact path={'/stock-list'} element={<StockList />} />
            <Route exact path={'/purchase'} element={<Purchase />} />
            <Route exact path={'/supplier'} element={<Supplier />} />
            <Route exact path={'/return'} element={<Return />} />
            <Route exact path={'/departments'} element={<Departments />} />
            <Route exact path={'/invoices'} element={<Invoices />} />
            <Route exact path={'/simple-invoice'} element={<SimpleInvoice />} />

            <Route exact path={'/expense'} element={<Expense />} />
            <Route exact path={'/salaryslip'} element={<Salaryslip />} />
            <Route exact path={'/chat'} element={<Chat />} />
            <Route exact path={'/calendar'} element={<Calendar />} />
            <Route exact path={'/store-location'} element={<StoreLocation />} />

            <Route exact path={'/profile-pages'} element={<ProfilePage />} />
            <Route exact path={'/price-plan'} element={<PricePlanExample />} />
            <Route exact path={'/contact-us'} element={<ContactUs />} />
            <Route exact path={'/icons'} element={<Icons />} />
            <Route exact path={'/form-example'} element={<FormsExample />} />
            <Route exact path={'/table-example'} element={<TableExample />} />
            <Route exact path={'/charts-example'} element={<ChartsExample />} />

            <Route exact path={'/ui-alerts'} element={<Alerts />} />
            <Route exact path={'/ui-badge'} element={<Badges />} />
            <Route exact path={'/ui-breadcrumb'} element={<Breadcrumb />} />
            <Route exact path={'/ui-buttons'} element={<Buttons />} />
            <Route exact path={'/ui-card'} element={<Cards />} />
            <Route exact path={'/ui-carousel'} element={<Carousel />} />
            <Route exact path={'/ui-collapse'} element={<Collapse />} />
            <Route exact path={'/ui-dropdowns'} element={<Dropdowns />} />
            <Route exact path={'/ui-listgroup'} element={<ListGroup />} />
            <Route exact path={'/ui-modalui'} element={<ModalUI />} />
            <Route exact path={'/ui-navbarui'} element={<NavbarUI />} />
            <Route exact path={'/ui-navsui'} element={<NavsUI />} />
            <Route exact path={'/ui-paginationui'} element={<PaginationUI />} />
            <Route exact path={'/ui-popoversui'} element={<PopoversUI />} />
            <Route exact path={'/ui-progressui'} element={<ProgressUI />} />
            <Route exact path={'/ui-Scrollspyui'} element={<Scrollspy />} />
            <Route exact path={'/ui-spinnersui'} element={<SpinnersUI />} />
            <Route exact path={'/ui-toastsui'} element={<ToastsUI />} />
            <Route exact path={'/stater-page'} element={<StaterPage />} />
            <Route exact path={'/documentation'} element={<Documentation />} />
            <Route exact path={'/changelog'} element={<Changelog />} />

            <Route exact path={'/help'} element={<Help />} />

            <Route exact path={'/blog-list'} element={<Blogs />} />
            <Route exact path={'/blog-categories-list'} element={<BlogCategoryList />} />
            <Route exact path={'/index.html'} element={<ProductList />} />

            {/* Catch-all route for undefined paths */}
            <Route path="*" element={<NotFound />} />
            </ReactRoutes>
    </div>
</div>
);
}

export default MainIndex;

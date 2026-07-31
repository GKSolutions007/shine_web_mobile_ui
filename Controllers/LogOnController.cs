using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Sockets;
using System.Net;
using System.Web;
using System.Web.Mvc;
using ShineWebMobile.Validations;
using System.Configuration;
using System.Data.SqlClient;
using System.Data;
using ShineWebMobile.Models;
using System.Web.Security;
using System.Text.RegularExpressions;
using System.Web.Services.Description;
using System.Security.Cryptography;
using System.Web.UI.WebControls;
using System.Web.Razor.Editor;
using System.Reflection.Emit;

namespace ShineWebMobile.Controllers
{
    public class LogOnController : Controller
    {
        LogonModel objLogonModel = new LogonModel();
        Dictionary<string, string> dicCompanyDetails = new Dictionary<string, string>();
        // GET: LogOn
        public ActionResult Index(string strMsg = null, string DivName = "", string DevID = "0",string strCompCode = "")
        {
            //DivName = "APPLE15"; DevID = "sdkf8da8s7dasd";
            Session["NavBarVisible"] = "LogOn";
            //Session["DeviceID"] =  DevID;
            //Session["DeviceName"] =  DivName;
            string api = "";
            string APIurl = (ConfigurationManager.AppSettings["apiurl"].ToString());
            Session["APIurl"] = APIurl;
            dicCompanyDetails = GetDBConfig();
            objLogonModel.CompanyCode = GetFilteredItemsFromDictionary(dicCompanyDetails);
            ViewData["MoborWindDevice"] = Request.Browser.IsMobileDevice ? "1" : "0";
            if (Request.Browser.IsMobileDevice)
            {
                if (Convert.ToString(Session["DeviceID"]) == "0")
                {
                    ViewData["AlertMessage"] = "Your session is timeout. Please Re-Initate the app(Remove this app from recent app,then open).";
                }
            }
            if (Session["authvalue"] != null)//Request.Cookies[".aspxauth"]
            {
                //DataTable dtWebExpireDate = GKS_BL.BL_ExecuteSqlQuery("select WebExpiryDate,F_SD,F_ED from tblCompanyRegistration");
                //if (Convert.ToDateTime(dtWebExpireDate.Rows[0][0]) >= DateTime.Today)
                {
                    api = "mobiledevicelogin/loginverify?Mode=1&TokenValue=" + Convert.ToString(Session["authvalue"]) + "&UID=0&DivIDent=0";
                    DataTable dtGet = ApiCall.ApiCallController.Executeapidatatable(api);
                    string strr = "";
                    if (dtGet.Rows.Count > 0)
                    {
                        strr = clsEncryptDecrypt.Decrypt(dtGet.Rows[0][6].ToString());
                        SqlConnectionStringBuilder BuildConnectionString = new SqlConnectionStringBuilder(strr);
                        Session["DBName"] = BuildConnectionString.InitialCatalog;
                        Session["DataSource"] = BuildConnectionString.DataSource;
                        Session["UserID"] = BuildConnectionString.UserID;
                        Session["Password"] = BuildConnectionString.Password;
                        Session["LoginUserID"] = dtGet.Rows[0][7].ToString();
                        api = "mobiledevicelogin/loginverify?Mode=2&TokenValue=" + Session["DBName"].ToString() + "&UID="+ Convert.ToInt32(dtGet.Rows[0][7]) + "&DivIDent=0";                        
                        DataTable dtUser = ApiCall.ApiCallController.Executeapidatatable(api);
                        DataRow[] drr = dtUser.Select();
                        //if (dtUser.Rows.Count > 0)
                        //{
                        //    drr = dtUser.Select("SessionStatus = 1 and DataBaseName ='" + Session["DBName"].ToString() + "'", "");
                        //}
                        if (drr.Length > 0)
                        {
                            if (Convert.ToInt32(dtGet.Rows[0][9]) == 1)
                            {
                                                               
                                return RedirectToAction("Index", "Home");
                            }
                            else
                            {
                                //return RedirectToAction("LogOut", "LogOff", "LogOn");
                                //return LogOff();
                                if (Request.Browser.IsMobileDevice)
                                {
                                    ViewData["SessionAlertMessage"] = "2";//User Already Login Another Location
                                }
                                return View(objLogonModel);

                            }
                        }
                        else
                        {
                            //ViewData["AlertMessage"] = "User Already Login Another Location";
                            return View(objLogonModel);
                        }
                    }
                    else
                    {
                        ViewData["SessionAlertMessage"] = "3";//Invalid .aspxauth Cookies Value
                        return View(objLogonModel);
                    }
                }
                //else
                //{
                //    ViewData["AlertMessage"] = "License Date expired. Contact admin. Date : "+ Convert.ToDateTime(dtWebExpireDate.Rows[0][0]).ToString("dd/MM/yyyy")+ ", DBName : " + strDBName;//License Date  expired
                //    GKS_BL.BL_SaveLoginInfo(2, DateTime.Now, DateTime.Now, "", "", Request.Cookies[".aspxauth"].Value, 0, 0, "", 0);
                //    return View(objLogonModel);
                //}
            }
            else
            {
                string strDivName = Convert.ToString(Session["DeviceName"]);
                string strDivID = Convert.ToString(Session["DeviceID"]);
                ViewData["AlertMessage"] = strMsg;//Cookies Cleared
                return View(objLogonModel);
            }
        }
        [ValidateAntiForgeryToken]
        [HttpPost]
        public ActionResult Index(LogonModel aLogon, string returnUrl)
        {
            bool isValid = false;
            string DivIdent = "0";
            string MsgID = "2", Message = "", Location = "0";
            DataTable dtDivVerify = new DataTable();
            //string MACs = SystemInfo.GetMACAddress();
            //string hd = SystemInfo.GetHDDSerialNo();
            //ViewData["AlertMessage"] = "MAC : " + MACs +"\n  HD S.No : " + hd;
            //string CookUser = Response.Cookies["UserName"].Value; string CookPswd = Response.Cookies["Password"].Value;
            if (ModelState.IsValid)// || !ModelState.IsValid
            {               
                bool IsMobDiv = false;
                //MessageBox.Show(u); Session["DeviceID"]
                //bool IsMBBBBB = isMobileBrowser();
                if (Request.Cookies["Verify"] != null)
                {
                    //IsMobDiv = true;// DivIdent = Request.Cookies["Verify"].Values["ID"] != null ? Request.Cookies["Verify"].Values["ID"] : "";
                }
                if (Request.Browser.IsMobileDevice || IsMobDiv)
                {
                    //DivIdent = Request.Cookies["Verify"].Values["ID"] != null ? Request.Cookies["Verify"].Values["ID"] : "";
                    //DivIdent = Session["DeviceID"] != null ? Convert.ToString(Session["DeviceID"]) : "";
                }
                if (aLogon.UsingUNPWD)// Login Using User Name / Password
                {
                    if (!string.IsNullOrEmpty(aLogon.Password) && !string.IsNullOrEmpty(aLogon.UserName))
                    {
                        string LoginPassword = clsEncryptDecrypt.Encrypt(aLogon.Password);
                        string api = "login/get?Companycode=" + aLogon.CompanyCodeID + "&UserName=" + aLogon.UserName + "&Password=" + aLogon.Password + "";
                        DataTable dtCompLogin = ApiCall.ApiCallController.ExecuteapidatatableAPIreturnlist(api);// GKS_BL.BL_ValidateMultipleCompany(1, aLogon.UserName, LoginPassword, "", "0", "");
                        if (dtCompLogin.Rows.Count > 0)
                        {
                            Session["CompanyCode"] = aLogon.CompanyCodeID;
                            Session["UserName"] = aLogon.UserName;
                            Session["LogPWD"] = LoginPassword;
                            Session["LPIN"] = "";
                            string UserID = dtCompLogin.Rows[0][1].ToString();
                            #region Mobile Device Validation
                            if (Request.Browser.IsMobileDevice || IsMobDiv)
                            {
                                string DivName = Convert.ToString(Session["DeviceName"]);
                                string DivID = Convert.ToString(Session["DeviceID"]);
                                api = "mobiledeviceverify/verify?Companycode=" + aLogon.CompanyCodeID + "&Mode=1&DeviceName=" + DivName + "&DeviceID=" + DivID + "&UID=0&DBName=&Active=0&Ident=0";
                                DataTable dtDev = ApiCall.ApiCallController.Executeapidatatable(api);
                                if (dtDev.Columns.Count == 2)
                                {
                                    HttpCookie cokkie = new HttpCookie("Verify");
                                    cokkie.Values.Add("ID", dtDev.Rows[0][1].ToString());
                                    Response.Cookies.Add(cokkie);
                                    Session["DeviceIdentID"] = dtDev.Rows[0][1].ToString();
                                    DivIdent = dtDev.Rows[0][1].ToString();
                                    if (dtDev.Rows[0][0].ToString().Contains("exists"))
                                    {
                                        api = "mobiledeviceverify/verify?Companycode=" + aLogon.CompanyCodeID + "&Mode=3&DeviceName=" + DivName + "&DeviceID=" + DivID + "&UID=" + UserID
                                            + "&DBName=&Active=0&Ident=" + DivIdent;
                                        DataTable dtDevcheck = ApiCall.ApiCallController.Executeapidatatable(api);
                                        if (dtDevcheck.Rows.Count > 0)
                                        {
                                            if (dtDevcheck.Rows[0][0].ToString() == "True")//Session["authvalue"] != null
                                            {
                                                api = "mobiledevicelogin/loginverify?Companycode=" + aLogon.CompanyCodeID + "&Mode=9&TokenValue=&UID=" + UserID + "&DivIDent=0";
                                                DataTable dtGet = ApiCall.ApiCallController.Executeapidatatable(api);
                                                string strr = "";
                                                DataTable dtClear = new DataTable();
                                                DataTable dtSamp = new DataTable();
                                                DataRow[] drr = dtSamp.Select();
                                                api = "mobiledevicelogin/loginverify?Companycode=" + aLogon.CompanyCodeID + "&Mode=3&TokenValue=&UID=" + UserID + "&DivIDent=" + Convert.ToInt32(dtDev.Rows[0][1].ToString());
                                                DataTable dtdiv = ApiCall.ApiCallController.Executeapidatatable(api);
                                                bool AlreadyHaveToken = false;
                                                //string tkn = Session["authvalue"].ToString();
                                                string Token = Session["authvalue"] != null ? Session["authvalue"].ToString() : null;                                                
                                                if (dtdiv.Rows.Count > 0)
                                                {
                                                    drr = dtdiv.Select("SessionStatus = 1", "");// and DeviceID = '" + DivID + "'
                                                    AlreadyHaveToken = dtdiv.Select("SessionStatus = 1 and DeviceID = '" + DivID + "' and TokenValue ='" + Token + "'", "").Length > 0;
                                                    if(drr.Length > 0)
                                                    {
                                                        api = "mobiledevicelogin/savelogininfo?Companycode=" + aLogon.CompanyCodeID + "&LoginMode=3&IpAddress=&DeviceName=&TokenValue=" + null + "&SesStatus=0&UserID=" + UserID + "&DBName=&DeviceID=" + Convert.ToInt32(dtDev.Rows[0][1].ToString());
                                                        DataTable dtLoginPost = ApiCall.ApiCallController.Executeapidatatable(api);
                                                        drr = dtClear.Select();
                                                    }
                                                }
                                                //Request.Cookies[".aspxauth"].Value
                                                if (drr.Length == 0 || AlreadyHaveToken)
                                                {
                                                    api = "mobiledevicelogin/getpermissions?Companycode=" + aLogon.CompanyCodeID + "&UID=" + UserID;
                                                    DataSet data = ApiCall.ApiCallController.Executeapidataset(api);
                                                    DataTable dts = data.Tables[2];
                                                    DataTable dtParent = data.Tables[3];
                                                    DataTable dtPermission = data.Tables[4];
                                                    DataRow[] Mobperm = dtPermission.Select("IsMobileApp = 1", "");
                                                    if (Mobperm.Length > 0)
                                                    {
                                                        //DataTable dts = GKS_BL.BL_ExecuteSqlQuery("SELECT userid AS UserID, RoleId AS RoleID, (SELECT CompanyCode FROM tblCompanyRegistration WHERE CompanyId = 1) AS CompanyName,username FROM tblManageUsers where Userid = " + dtGet.Rows[0][7]);
                                                        Session["LoginUserID"] = dts.Rows[0]["ID"].ToString();
                                                        Session["LoginRoleID"] = dts.Rows[0]["RoleID"].ToString();
                                                        Session["UserName"] = dts.Rows[0]["UserName"].ToString();
                                                        Session["NavBarVisible"] = "UserPermission";

                                                        DataTable dtCompany = data.Tables[0];
                                                        Session["CompanyCode"] = dtCompany.Rows[0][1].ToString();
                                                        Session["CompanyName"] = dtCompany.Rows[0][2].ToString();
                                                        Session["DBName"] = dtCompany.Rows[0]["DBName"].ToString();


                                                        Session["dtParent"] = dtParent;
                                                        Session["dtPermission"] = dtPermission;
                                                        DataTable dtCompReg = data.Tables[0];
                                                        Session["F_SD"] = Convert.ToDateTime(dtCompReg.Rows[0]["F_SD"].ToString()).ToString("yyyy-MM-dd");//,dtCompReg.Rows[0]["F_SD"].ToString();
                                                        Session["F_ED"] = Convert.ToDateTime(dtCompReg.Rows[0]["F_ED"].ToString()).ToString("yyyy-MM-dd");//dtCompReg.Rows[0]["F_ED"].ToString();
                                                        DataTable dtAppconfig = data.Tables[1];
                                                        Session["ConfirmFocus"] = dtAppconfig.Rows[0]["Confirmpopup"].ToString();
                                                        Session["ClearConfirmFocus"] = dtAppconfig.Rows[0]["ClearConfirmpopup"].ToString();
                                                        Session["CloseConfirmFocus"] = dtAppconfig.Rows[0]["CloseConfirmpopup"].ToString();
                                                        Session["DecimalValues"] = dtAppconfig.Rows[0]["DecimalValues"].ToString();
                                                        Session["ItemOrderby"] = dtAppconfig.Rows[0]["ItemOrderby"].ToString();
                                                        Session["ItemsperPage"] = dtAppconfig.Rows[0]["ItemsperPage"].ToString();
                                                        Session["APIURL"] = ConfigurationManager.AppSettings["apiurl"].ToString();
                                                        FormsAuthenticationTicket authTicket;
                                                        HttpCookie authCookie;
                                                        int sessionLength = 525600;// (aLogon.RememberMe) ? 525600 : 55600; //525600 = one year
                                                        authTicket = new FormsAuthenticationTicket(1, aLogon.UserName, DateTime.Now, DateTime.Now.AddMinutes(sessionLength), true, UserID);
                                                        authCookie = new HttpCookie(".aspxauth");
                                                        authCookie.Expires = DateTime.Now.AddMinutes(sessionLength);
                                                        authCookie.Value = FormsAuthentication.Encrypt(authTicket);
                                                        Response.Cookies.Add(authCookie);
                                                        Session["authvalue"] = authCookie.Value;
                                                        //int LoginMode, string IpAddress, string DeviceName, string TokenValue, int SesStatus, int UserID = 0, string DBName = "", int DeviceID = 0
                                                        api = "mobiledevicelogin/savelogininfo?Companycode=" + aLogon.CompanyCodeID + "&LoginMode=1&IpAddress=" + IPHelper.GetIPAddress() + "&DeviceName=" + IPHelper.GetWorkstationName(IPHelper.GetIPAddress()) +
                                                            "&TokenValue=" + authCookie.Value + "&SesStatus=1&UserID=" + UserID + "&DBName=&DeviceID=" + DivIdent;
                                                        DataTable dtLoginPost = ApiCall.ApiCallController.Executeapidatatable(api);

                                                        return RedirectToAction("Index", "Home");
                                                    }
                                                    else
                                                    {
                                                        Message += " You don't have any permissions. Contact admin";
                                                        return RedirectToAction("Index", "LogOn", new { strMsg = Message });
                                                    }

                                                }
                                                else
                                                {
                                                    Message += " User Already Login Another Location";
                                                    //if (string.IsNullOrEmpty(Session["DBName"].ToString()))
                                                    //{
                                                    //    ViewData["AlertMessage"] = "DBName is cleared in Session";
                                                    //}
                                                    HttpCookie cookie = new HttpCookie(".aspxauth");
                                                    cookie.Expires = DateTime.Now.AddDays(-1);
                                                    Response.Cookies.Add(cookie);
                                                    return RedirectToAction("Index", "LogOn", new { strMsg = Message });
                                                }

                                            }
                                            else
                                            {
                                                Message += " Device Not Approved. Contact admin.";
                                                ViewData["SessionAlertMessage"] = "1";//Cookies Cleared
                                                return RedirectToAction("Index", "LogOn", new { strMsg = Message, DivName = DivName, DevID = DivIdent });
                                            }
                                        }
                                        else
                                        {
                                            api = "mobiledeviceverify/verify?Companycode=" + aLogon.CompanyCodeID + "&Mode=2&DeviceName=" + DivName + "&DeviceID=" + DivID + "&UID=" + UserID + "&DBName=&Active=0&Ident=" + DivIdent;
                                            DataTable dtNewDev = ApiCall.ApiCallController.Executeapidatatable(api);

                                            Message += "New Device for Approval.";
                                            HttpCookie cokk = new HttpCookie("Verify");
                                            cokk.Values.Add("ID", DivIdent);
                                            Response.Cookies.Add(cokk);
                                            Session["DeviceIdentID"] = DivIdent;
                                            return RedirectToAction("Index", "LogOn", new { strMsg = Message, DivName = "", DevID = "" });
                                        }
                                    }
                                    else
                                    {
                                        Message += "Your Device Cannot Approved. Contact Admin";
                                        ViewData["AlertMessage"] = "Your Device Cannot Approved. Contact Admin";
                                        return RedirectToAction("Index", "LogOn", new { strMsg = Message, DivName = "", DevID = "" });
                                    }
                                }
                                else if (dtDev.Columns.Count == 1)
                                {
                                    Message += "New Device for Approval.";
                                    HttpCookie cokk = new HttpCookie("Verify");
                                    cokk.Values.Add("ID", dtDev.Rows[0][0].ToString());
                                    Response.Cookies.Add(cokk);
                                    Session["DeviceIdentID"] = dtDev.Rows[0][0].ToString();
                                    DivIdent = dtDev.Rows[0][0].ToString();

                                    api = "mobiledeviceverify/verify?Companycode=" + aLogon.CompanyCodeID + "&Mode=2&DeviceName=" + DivName + "&DeviceID=" + DivID + "&UID=" + UserID + "&DBName=&Active=0&Ident=" + DivIdent;
                                    DataTable dtNewDev = ApiCall.ApiCallController.Executeapidatatable(api);

                                    return RedirectToAction("Index", "LogOn", new { strMsg = Message, DivName = "", DevID = "" });
                                    //ViewData["AlertMessage"] = "Activate your Device to Access. Contact Admin";
                                    //return View();
                                }
                                else
                                {
                                    ViewData["AlertMessage"] = "Your Device not Found";
                                    return RedirectToAction("Index", "Verify");
                                }
                            }
                            #endregion
                            else
                            {
                                api = "mobiledevicelogin/loginverify?Companycode=" + aLogon.CompanyCodeID + "&Mode=9&TokenValue=&UID=" + UserID + "&DivIDent=0";
                                DataTable dtGet = ApiCall.ApiCallController.Executeapidatatable(api);
                                DataTable dtSamp = new DataTable();
                                DataRow[] drr = dtSamp.Select();
                                if (dtGet.Rows.Count > 0)
                                {
                                    drr = dtGet.Select("SessionStatus = 1", "");
                                    if (drr.Length > 0)
                                    {
                                        api = "mobiledevicelogin/savelogininfo?Companycode=" + aLogon.CompanyCodeID + "&LoginMode=3&IpAddress=&DeviceName=&TokenValue=" + null +
                                            "&SesStatus=0&UserID=" + UserID + "&DBName=&DeviceID=0";
                                        DataTable dtLoginPost = ApiCall.ApiCallController.Executeapidatatable(api);
                                        drr = dtSamp.Select();
                                    }
                                }
                                if (drr.Length == 0)
                                {
                                    api = "mobiledevicelogin/getpermissions?Companycode=" + aLogon.CompanyCodeID + "&UID=" + UserID;
                                    DataSet data = ApiCall.ApiCallController.Executeapidataset(api);
                                    DataTable dts = data.Tables[2];
                                    DataTable dtParent = data.Tables[3];
                                    DataTable dtPermission = data.Tables[4];
                                    DataRow[] Mobperm = dtPermission.Select("IsMobileApp = 1", "");
                                    if (Mobperm.Length > 0)
                                    {
                                        
                                        //DataTable dts = GKS_BL.BL_ExecuteSqlQuery("SELECT userid AS UserID, RoleId AS RoleID, (SELECT CompanyCode FROM tblCompanyRegistration WHERE CompanyId = 1) AS CompanyName,username FROM tblManageUsers where Userid = " + dtGet.Rows[0][7]);
                                        Session["LoginUserID"] = dts.Rows[0]["ID"].ToString();
                                        Session["LoginRoleID"] = dts.Rows[0]["RoleID"].ToString();

                                        Session["UserName"] = dts.Rows[0]["UserName"].ToString();
                                        Session["NavBarVisible"] = "UserPermission";

                                        DataTable dtCompany = data.Tables[0];
                                        Session["CompanyCode"] = dtCompany.Rows[0][1].ToString();
                                        Session["CompanyName"] = dtCompany.Rows[0][2].ToString();
                                        Session["DBName"] = dtCompany.Rows[0]["DBName"].ToString();

                                        Session["dtParent"] = dtParent;
                                        Session["dtPermission"] = dtPermission;
                                        DataTable dtCompReg = data.Tables[0];
                                        Session["F_SD"] = Convert.ToDateTime(dtCompReg.Rows[0]["F_SD"].ToString()).ToString("yyyy-MM-dd");//,dtCompReg.Rows[0]["F_SD"].ToString();
                                        Session["F_ED"] = Convert.ToDateTime(dtCompReg.Rows[0]["F_ED"].ToString()).ToString("yyyy-MM-dd");//dtCompReg.Rows[0]["F_ED"].ToString();
                                        DataTable dtAppconfig = data.Tables[1];
                                        Session["ConfirmFocus"] = dtAppconfig.Rows[0]["Confirmpopup"].ToString();
                                        Session["ClearConfirmFocus"] = dtAppconfig.Rows[0]["ClearConfirmpopup"].ToString();
                                        Session["CloseConfirmFocus"] = dtAppconfig.Rows[0]["CloseConfirmpopup"].ToString();
                                        Session["DecimalValues"] = dtAppconfig.Rows[0]["DecimalValues"].ToString();
                                        Session["ItemOrderby"] = dtAppconfig.Rows[0]["ItemOrderby"].ToString();
                                        Session["ItemsperPage"] = dtAppconfig.Rows[0]["ItemsperPage"].ToString();
                                        //Random RN = new Random();
                                        //int LogToken = Convert.ToInt32(RN.Next(100000, 999999));
                                        //Session["LoginToken"] = LogToken.ToString();
                                        //Session["ConnStr"] = HttpUtility.UrlEncode(clsEncryptDecrypt.Encrypt(strr));//strr; 
                                        Session["APIURL"] = ConfigurationManager.AppSettings["apiurl"].ToString();
                                        //Session["GAPI"] = clsEncryptDecrypt.Decrypt(ConfigurationManager.ConnectionStrings["GAPIs"].ConnectionString);
                                        //Session["WEBGKSURL"] = HttpUtility.UrlEncode((ConfigurationManager.ConnectionStrings["WEBGKS"].ConnectionString));
                                        //DataTable dtAppConfigValues = GKS_BL.BL_ExecuteParamSP("uspLoadAppConfigData", 1);
                                        //Session["ALFType"] = dtAppConfigValues.Rows[0]["WebSearchbystart"].ToString();
                                        //DataTable dtcnfg = GKS_BL.BL_ExecuteParamSP("uspWebPrintProfileconfig", 3, 4, 0);
                                        //Session["DefaultConfigID"] = dtcnfg.Rows.Count > 0 ? dtcnfg.Rows[0][0].ToString() : "0";                                    
                                        FormsAuthenticationTicket authTicket;
                                        HttpCookie authCookie;
                                        int sessionLength = 525600;// (aLogon.RememberMe) ? 525600 : 55600; //525600 = one year
                                        authTicket = new FormsAuthenticationTicket(1, aLogon.UserName, DateTime.Now, DateTime.Now.AddMinutes(sessionLength), true, UserID);
                                        authCookie = new HttpCookie(".aspxauth");
                                        authCookie.Expires = DateTime.Now.AddMinutes(sessionLength);
                                        authCookie.Value = FormsAuthentication.Encrypt(authTicket);
                                        Response.Cookies.Add(authCookie);
                                        Session["authvalue"] = authCookie.Value;
                                        //int LoginMode, string IpAddress, string DeviceName, string TokenValue, int SesStatus, int UserID = 0, string DBName = "", int DeviceID = 0
                                        api = "mobiledevicelogin/savelogininfo?Companycode=" + aLogon.CompanyCodeID + "&LoginMode=1&IpAddress=" + IPHelper.GetIPAddress() + "&DeviceName=" + IPHelper.GetWorkstationName(IPHelper.GetIPAddress()) +
                                            "&TokenValue=" + authCookie.Value + "&SesStatus=1&UserID=" + UserID + "&DBName=&DeviceID=0";
                                        DataTable dtLoginPost = ApiCall.ApiCallController.Executeapidatatable(api);
                                        return RedirectToAction("Index", "Home");
                                    }
                                    else
                                    {
                                        Message += " You don't have any permissions. Contact admin";
                                        return RedirectToAction("Index", "LogOn", new { strMsg = Message });
                                    }
                                }
                                else
                                {
                                    Message += " User Already Login Another Location";
                                    //if (string.IsNullOrEmpty(Session["DBName"].ToString()))
                                    //{
                                    //    ViewData["AlertMessage"] = "DBName is cleared in Session";
                                    //}
                                    HttpCookie cookie = new HttpCookie(".aspxauth");
                                    cookie.Expires = DateTime.Now.AddDays(-1);
                                    Response.Cookies.Add(cookie);
                                    return RedirectToAction("Index", "LogOn", new { strMsg = Message, DevID = DivIdent });
                                }
                            }                            
                        }
                        else
                        {
                            ViewData["AlertMessage"] = "Invalid Username and Password";
                            ViewData["EID"] = "1";
                            ViewData["MoborWindDevice"] = Request.Browser.IsMobileDevice ? "1" : "0";
                            dicCompanyDetails = GetDBConfig();
                            objLogonModel.CompanyCode = GetFilteredItemsFromDictionary(dicCompanyDetails);
                            return View(objLogonModel);
                        }
                    }
                    else
                    {
                        ViewData["AlertMessage"] = "Invalid Username and Password";
                        ViewData["EID"] = "1";
                        ViewData["MoborWindDevice"] = Request.Browser.IsMobileDevice ? "1" : "0";
                        dicCompanyDetails = GetDBConfig();
                        objLogonModel.CompanyCode = GetFilteredItemsFromDictionary(dicCompanyDetails);
                        return View(objLogonModel);
                    }
                }
                else
                {
                    if (!string.IsNullOrEmpty(aLogon.PIN))
                    {
                        string LoginPassword = "", LoginUserName = "";
                        string EncPIN = clsEncryptDecrypt.Encrypt(aLogon.PIN);
                        DataTable dtCompLogin = new DataTable();//GKS_BL.BL_ValidateMultipleCompany(4, EncPIN, "", "", "0", "");
                        if (dtCompLogin.Rows.Count > 0)
                        {
                            LoginPassword = (dtCompLogin.Rows[0][3].ToString());
                            LoginUserName = dtCompLogin.Rows[0][2].ToString();
                            Session["UserName"] = LoginUserName;
                            Session["LogPWD"] = LoginPassword;
                            Session["LPIN"] = EncPIN;
                            return RedirectToAction("Index", "TestSamp", new { Username = LoginUserName, Passowrd = LoginPassword, DevID = DivIdent, PIN = EncPIN });
                        }
                        else
                        {
                            ViewData["AlertMessage"] = "Invalid L-PIN.";
                            ViewData["EID"] = "2";
                            ViewData["MoborWindDevice"] = Request.Browser.IsMobileDevice ? "1" : "0";
                            return View();
                        }
                    }
                    else
                    {
                        ViewData["AlertMessage"] = "L-PIN should not be empty.";
                        ViewData["EID"] = "2";
                        ViewData["MoborWindDevice"] = Request.Browser.IsMobileDevice ? "1" : "0";
                        return View();
                    }
                }                
            }

            if (!isValid)
            {
                //GKS_BL.GetConnectionInfo(ref DataSource, ref UserID, ref Password);
                //GKS_BL = new clsBusinessLayer(DataSource, strDBName, UserID, Password);
                dicCompanyDetails = GetDBConfig();
                objLogonModel.CompanyCode = GetFilteredItemsFromDictionary(dicCompanyDetails);
                return View(objLogonModel);
            }
            return View();
        }
        public static IEnumerable<SelectListItem> GetFilteredItemsFromDictionary(Dictionary<string, string> elements)
        {
            // Create an empty list to hold result of the operation
            var selectList = new List<SelectListItem>();

            // For each string in the 'elements' variable, create a new SelectListItem object
            // that has both its Value and Text properties set to a particular value.
            // This will result in MVC rendering each item as:
            //     <option value="NameKey">Name</option>
            foreach (var element in elements)
            {
                selectList.Add(new SelectListItem
                {
                    Value = element.Key,
                    Text = element.Value
                });
            }
            return selectList;
        }
        private Dictionary<string, string> GetDBConfig()
        {

            Dictionary<string, string> dicCompanyCode = new Dictionary<string, string>();
            DataTable dtCompDetail = new DataTable();
            if (dtCompDetail.Columns.Count == 0)
            {
                dtCompDetail.Columns.Add("DBName", typeof(string));
                dtCompDetail.Columns.Add("CompCode", typeof(string));
            }
            string ccs = ConfigurationManager.AppSettings["CompanyCode"].ToString();
            string[] CCodes = ccs.Split(',');
            string DBCompCodes = string.Empty;
            foreach (string item in CCodes)
            {
                dicCompanyCode.Add(item.ToString(), item.ToString());
            }            
            return dicCompanyCode;
        }        
        public ActionResult LogOff()
        {
           
            int UserID = Convert.ToInt32(Session["LoginUserID"]);
            string ss = Convert.ToString(Session["UserName"]);
            string DevIDs = Convert.ToString(Session["DeviceID"]);
            string DevName = Convert.ToString(Session["DeviceName"]);
            string CompCode = Convert.ToString(Session["CompanyCode"]);
            HttpContext.Response.Cache.SetExpires(DateTime.UtcNow.AddMinutes(-1));
            HttpContext.Response.Cache.SetCacheability(HttpCacheability.NoCache);
            HttpContext.Response.Cache.SetNoStore();
            Session.Clear();
            Session.Abandon();
            Session.RemoveAll();
            //if (Request.Browser.IsMobileDevice)
            //{
            if (Request.Cookies[".aspxauth"] != null)
            {
                string api = "mobiledevicelogin/savelogininfo?Companycode=" + CompCode + "&LoginMode=2&IpAddress=&DeviceName=&TokenValue=" + Request.Cookies[".aspxauth"].Value + "&SesStatus=0&UserID=" + UserID + "&DBName=&DeviceID=0";
                DataTable dtLoginPost = ApiCall.ApiCallController.Executeapidatatable(api);
            }
            //}
            FormsAuthentication.SignOut();
            HttpCookie cookie = new HttpCookie(".aspxauth");

            //cookie.Values.Add("UserName", "");
            //cookie.Values.Add("Password", "");
            //cookie.Values.Add("RememberMe", "");
            //cookie.Values.Add("CompanyDB", "");
            cookie.Expires = DateTime.Now.AddDays(-1);
            Response.Cookies.Add(cookie);
            Session["DeviceID"] = DevIDs;
            Session["DeviceName"] = DevName;
            //HttpCookie cookieqq = new HttpCookie("Verify");
            //cookieqq.Expires = DateTime.Now.AddDays(-1);
            //Response.Cookies.Add(cookieqq);
            if (Request.Browser.IsMobileDevice)
            {
                return RedirectToAction("Index", "VerifyMobileDevice", new { DivName = DevName, DevID = DevIDs });
            }
            return RedirectToAction("Index", "LogOn", new { strMsg = "" });
        }
    }
    
    public static class IPHelper
    {
        public static string GetIPAddress()
        {
            HttpContext context = HttpContext.Current;
            if (context != null)
            {
                string ipAddress = context.Request.ClientIPFromRequest();
                if (!string.IsNullOrEmpty(ipAddress) && ipAddress.Trim() != "::1")
                {
                    return ipAddress;
                }
            }
            return GetLANIPAddress();
        }


        public static string GetWorkstationName(string ip)
        {
            HttpContext context = HttpContext.Current;
            if (context != null)
            {
                try
                {
                    IPAddress myIP = System.Net.IPAddress.Parse(ip);
                    IPHostEntry GetIPHost = Dns.GetHostEntry(myIP);
                    List<string> compName = GetIPHost.HostName.ToString().Split('.').ToList();
                    return compName.First().ToUpper();
                }
                catch
                {
                    return Dns.GetHostName();
                }
            }
            return Dns.GetHostName();
        }

        public static string GetLANIPAddress()
        {
            string retIP = "127.0.0.1";
            IPHostEntry hostEntry = Dns.GetHostEntry(Dns.GetHostName());
            IPAddress[] iPAddresses = Array.FindAll(hostEntry.AddressList, a => a.AddressFamily == AddressFamily.InterNetwork);
            try
            {
                retIP = iPAddresses[iPAddresses.Length - 2].ToString();
            }
            catch
            {
                try
                {
                    retIP = iPAddresses[0].ToString();
                }
                catch
                {
                    try
                    {
                        iPAddresses = Dns.GetHostAddresses(Dns.GetHostName());
                        retIP = iPAddresses[0].ToString();
                    }
                    catch
                    { }
                }
            }
            return retIP;
        }

        public static string ClientIPFromRequest(this HttpRequest request, bool skipPrivate = false)
        {
            foreach (var item in s_HeaderItems)
            {
                var ipString = request.ServerVariables[item.Key];

                //ExecutionLogger.Instance.Log(String.Format("{0}: {1}", item.Key, ipString));

                if (String.IsNullOrEmpty(ipString))
                    continue;

                if (item.Split)
                {
                    foreach (var ip in ipString.Split(','))
                        if (ValidIP(ip, skipPrivate))
                            return ip;
                }
                else
                {
                    if (ValidIP(ipString, skipPrivate))
                        return ipString;
                }
            }

            return request.UserHostAddress;
        }

        private static bool ValidIP(string ip, bool skipPrivate)
        {
            IPAddress ipAddr;

            ip = ip == null ? String.Empty : ip.Trim();

            if (0 == ip.Length
                || false == IPAddress.TryParse(ip, out ipAddr)
                || (ipAddr.AddressFamily != AddressFamily.InterNetwork
                    && ipAddr.AddressFamily != AddressFamily.InterNetworkV6))
                return false;

            if (skipPrivate && ipAddr.AddressFamily == AddressFamily.InterNetwork)
            {
                var addr = IpRange.AddrToUInt64(ipAddr);
                foreach (var range in s_PrivateRanges)
                {
                    if (range.Encompasses(addr))
                        return false;
                }
            }

            return true;
        }

        /// <summary>
        /// Provides a simple class that understands how to parse and compare IP addresses (IPV4) ranges.
        /// </summary>
        private sealed class IpRange
        {
            private readonly UInt64 _start;
            private readonly UInt64 _end;

            public IpRange(string startStr, string endStr)
            {
                _start = ParseToUInt64(startStr);
                _end = ParseToUInt64(endStr);
            }

            public static UInt64 AddrToUInt64(IPAddress ip)
            {
                var ipBytes = ip.GetAddressBytes();
                UInt64 value = 0;

                foreach (var abyte in ipBytes)
                {
                    value <<= 8;    // shift
                    value += abyte;
                }

                return value;
            }

            public static UInt64 ParseToUInt64(string ipStr)
            {
                var ip = IPAddress.Parse(ipStr);
                return AddrToUInt64(ip);
            }

            public bool Encompasses(UInt64 addrValue)
            {
                return _start <= addrValue && addrValue <= _end;
            }

            public bool Encompasses(IPAddress addr)
            {
                var value = AddrToUInt64(addr);
                return Encompasses(value);
            }
        };

        private static readonly IpRange[] s_PrivateRanges =
            new IpRange[] {
                new IpRange("0.0.0.0","2.255.255.255"),
                new IpRange("10.0.0.0","10.255.255.255"),
                new IpRange("127.0.0.0","127.255.255.255"),
                new IpRange("169.254.0.0","169.254.255.255"),
                new IpRange("172.16.0.0","172.31.255.255"),
                new IpRange("192.0.2.0","192.0.2.255"),
                new IpRange("192.168.0.0","192.168.255.255"),
                new IpRange("255.255.255.0","255.255.255.255")
            };

        /// <summary>
        /// Describes a header item (key) and if it is expected to be a comma-delimited string
        /// </summary>
        private sealed class HeaderItem
        {
            public readonly string Key;
            public readonly bool Split;

            public HeaderItem(string key, bool split)
            {
                Key = key;
                Split = split;
            }
        }

        // order is in trust/use order top to bottom
        private static readonly HeaderItem[] s_HeaderItems =
            new HeaderItem[] {
                new HeaderItem("HTTP_X_COMING_FROM",false),
                new HeaderItem("HTTP_COMING_FROM",false),
                new HeaderItem("HTTP_FROM",false),
                new HeaderItem("HTTP_CLIENT_IP",false),
                new HeaderItem("CLIENT_IP",false),
                new HeaderItem("HTTP_X_FORWARDED_FOR",true),
                new HeaderItem("HTTP_X_FORWARDED",false),
                new HeaderItem("HTTP_X_CLUSTER_CLIENT_IP",false),
                new HeaderItem("HTTP_FORWARDED_FOR",false),
                new HeaderItem("HTTP_FORWARDED",false),
                new HeaderItem("FORWARDED",false),
                new HeaderItem("HTTP_VIA",false),
                new HeaderItem("REMOTE_ADDR",false)
            };
    }
}
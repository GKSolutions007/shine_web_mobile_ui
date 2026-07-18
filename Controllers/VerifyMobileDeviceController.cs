using ShineWebMobile.Validations;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;
using System.Data;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using ShineWebMobile.ApiCall;
using System.Web.UI.WebControls;
using System.Web.Security;
using System.Web.Services.Description;
using System.Web.Razor.Editor;
namespace ShineWebMobile.Controllers
{
    public class VerifyMobileDeviceController : Controller
    {
        // GET: VerifyMobileDevice
        public ActionResult Index(string DivName, string DevID,string CompanyCode = "")
        {
            string api = "", Message = "", DivIdent = "0", UserID = "0", UserName = "";
            string devicename = DivName;
            string deviceANDid = DevID;
            string SessCompanycode = Session["CompanyCode"] != null ? Session["CompanyCode"].ToString() : null;
            Session["DeviceID"] = deviceANDid;
            Session["DeviceName"] = devicename;
            Session["CompanyCode"] = SessCompanycode;
            string Token = Session["authvalue"] != null ? Session["authvalue"].ToString() : null;            
            CompanyCode = SessCompanycode;
            UserID= Session["LoginUserID"] != null ? Session["LoginUserID"].ToString() : "0";
            var isf = false;
            if (!string.IsNullOrEmpty(CompanyCode))// && isf
            {
                api = "mobiledeviceverify/verify?Companycode=" + CompanyCode + "&Mode=1&DeviceName=" + devicename + "&DeviceID=" + deviceANDid + "&UID=0&DBName=&Active=0&Ident=0";
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
                        api = "mobiledeviceverify/verify?Companycode=" + CompanyCode + "&Mode=3&DeviceName=" + DivName + "&DeviceID=" + deviceANDid + "&UID=" + UserID
                            + "&DBName=&Active=0&Ident=" + DivIdent;
                        DataTable dtDevcheck = ApiCall.ApiCallController.Executeapidatatable(api);
                        if (dtDevcheck.Rows.Count > 0)
                        {
                            if (dtDevcheck.Rows[0][0].ToString() == "True")//Session["authvalue"] != null
                            {
                                UserID = dtDevcheck.Rows[0][1].ToString();
                                UserName = dtDevcheck.Rows[0][2].ToString();
                                api = "mobiledevicelogin/loginverify?Companycode=" + CompanyCode + "&Mode=9&TokenValue=&UID=" + UserID + "&DivIDent=0";
                                DataTable dtGet = ApiCall.ApiCallController.Executeapidatatable(api);
                                string strr = "";
                                if (dtGet.Rows.Count == 0 || dtGet.Rows.Count > 0)
                                {
                                    DataTable dtSamp = new DataTable();
                                    DataRow[] drr = dtSamp.Select();
                                    api = "mobiledevicelogin/loginverify?Companycode=" + CompanyCode + "&Mode=3&TokenValue=&UID=" + UserID + "&DivIDent=" + Convert.ToInt32(dtDev.Rows[0][1].ToString());
                                    DataTable dtdiv = ApiCall.ApiCallController.Executeapidatatable(api);
                                    if (dtdiv.Rows.Count > 0)
                                    {
                                        drr = dtdiv.Select("SessionStatus = 1 and DeviceID = '" + deviceANDid + "'", "");
                                    }
                                    if (drr.Length == 0 || drr.Length > 0)
                                    {
                                        
                                        api = "mobiledevicelogin/getpermissions?Companycode=" + CompanyCode + "&UID=" + UserID;
                                        DataSet data = ApiCall.ApiCallController.Executeapidataset(api);
                                        DataTable dtParent = data.Tables[3];
                                        DataTable dtPermission = data.Tables[4];
                                        DataTable dtReportParent = data.Tables[5];
                                        DataTable dtReportPermission = data.Tables[6];
                                        DataRow[] Mobperm = dtPermission.Select("IsMobileApp = 1", "");
                                        if (Mobperm.Length > 0)
                                        {


                                            DataTable dts = data.Tables[2];
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
                                            Session["dtReportParent"] = dtReportParent;
                                            Session["dtReportPermission"] = dtReportPermission;
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
                                            authTicket = new FormsAuthenticationTicket(1, UserName, DateTime.Now, DateTime.Now.AddMinutes(sessionLength), true, UserID);
                                            authCookie = new HttpCookie(".aspxauth");
                                            authCookie.Expires = DateTime.Now.AddMinutes(sessionLength);
                                            authCookie.Value = FormsAuthentication.Encrypt(authTicket);
                                            Response.Cookies.Add(authCookie);
                                            Session["authvalue"] = authCookie.Value;
                                            //int LoginMode, string IpAddress, string DeviceName, string TokenValue, int SesStatus, int UserID = 0, string DBName = "", int DeviceID = 0
                                            api = "mobiledevicelogin/savelogininfo?Companycode=" + CompanyCode + "&LoginMode=1&IpAddress=" + IPHelper.GetIPAddress() + "&DeviceName=" + IPHelper.GetWorkstationName(IPHelper.GetIPAddress()) +
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
                            api = "mobiledeviceverify/verify?Companycode=" + CompanyCode + "&Mode=2&DeviceName=" + DivName + "&DeviceID=" + deviceANDid + "&UID=" + UserID + "&DBName=&Active=0&Ident=" + DivIdent;
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
                else
                {
                    ViewData["AlertMessage"] = "Your Device not Found";
                    return RedirectToAction("Index", "Verify");
                }
            }
            return RedirectToAction("Index", "LogOn", new { strMsg = "", DivName = devicename, DevID = deviceANDid,strCompCode = CompanyCode });            
        }
        //public void previousmethod(int sampmode, string DivName, string DivID)
        //{
        //    string MSG = "", DID = "0";
        //    //string Mode, string DeviceName, string DeviceID, string UID, string DBName, string Active, string Ident
        //    string api = "mobiledeviceverify/verify?Mode=1&DeviceName=" + DivName + "&DeviceID=" + DivID + "&UID=0&DBName=&Active=0&Ident=0";
        //    DataTable dtDev = ApiCall.ApiCallController.Executeapidatatable(api);
        //    string strUserAgent = Request.UserAgent.ToString().ToLower();
        //    if (dtDev.Columns.Count == 2)
        //    {
        //        MSG = "Dev ID : " + dtDev.Rows[0][1].ToString();
        //        //if (this.Response.Cookies["Verify"] == null)
        //        //{
        //        HttpCookie cokkie = new HttpCookie("Verify");
        //        cokkie.Values.Add("ID", dtDev.Rows[0][1].ToString());
        //        Response.Cookies.Add(cokkie);
        //        Session["DevID"] = dtDev.Rows[0][1].ToString();
        //        DID = dtDev.Rows[0][1].ToString();
        //        //}
        //        if (dtDev.Rows[0][0].ToString().Contains("exists"))
        //        {
        //            //MSG += " ,Cookes auth : " + Request.Cookies[".aspxauth"].ToString();
        //            //Session["authvalue"] = authCookie.Value;
        //            if (Session["authvalue"] != null)//Request.Cookies[".aspxauth"]
        //            {
        //                api = "mobiledevicelogin/loginverify?Mode=1&TokenValue=" + Convert.ToString(Session["authvalue"]) + "&UID=0&DivIDent=0";
        //                DataTable dtGet = ApiCall.ApiCallController.Executeapidatatable(api);
        //                string strr = "";
        //                if (dtGet.Rows.Count > 0)
        //                {
        //                    strr = clsEncryptDecrypt.Decrypt(dtGet.Rows[0][6].ToString());
        //                    SqlConnectionStringBuilder BuildConnectionString = new SqlConnectionStringBuilder(strr);
        //                    Session["DBName"] = BuildConnectionString.InitialCatalog;
        //                    Session["DataSource"] = BuildConnectionString.DataSource;
        //                    Session["UserID"] = BuildConnectionString.UserID;
        //                    Session["Password"] = BuildConnectionString.Password;
        //                    Session["LoginUserID"] = dtGet.Rows[0][7].ToString();
        //                    //DataTable dtUser = GKS_BL.BL_LoginInfoRecieve(2, "", Convert.ToInt32(dtGet.Rows[0][7]));
        //                    DataTable dtSamp = new DataTable();
        //                    DataRow[] drr = dtSamp.Select();
        //                    api = "mobiledevicelogin/loginverify?Mode=3&TokenValue=" + Convert.ToString(Session["authvalue"]) + "&UID=0&DivIDent=" + Convert.ToInt32(dtDev.Rows[0][1].ToString());
        //                    DataTable dtdiv = ApiCall.ApiCallController.Executeapidatatable(api);
        //                    if (dtdiv.Rows.Count > 0)
        //                    {
        //                        drr = dtdiv.Select("SessionStatus = 1 and DataBaseName ='" + Session["DBName"].ToString() + "' and DeviceID = '" + DivID + "'", "");
        //                    }
        //                    if (drr.Length >= 1)
        //                    {
        //                        if (Convert.ToBoolean(dtGet.Rows[0][9].ToString()) && Convert.ToString(dtGet.Rows[0][8].ToString()) == Session["DBName"].ToString())
        //                        {
        //                            //DataTable dts = GKS_BL.BL_ExecuteSqlQuery("SELECT userid AS UserID, RoleId AS RoleID, (SELECT CompanyCode FROM tblCompanyRegistration WHERE CompanyId = 1) AS CompanyName,username FROM tblManageUsers where Userid = " + dtGet.Rows[0][7]);
        //                            //Session["LoginUserID"] = dts.Rows[0][0].ToString();
        //                            //Session["LoginRoleID"] = dts.Rows[0][1].ToString();
        //                            //Session["CompanyCode"] = dts.Rows[0][2].ToString();
        //                            //Session["UserName"] = dts.Rows[0][3].ToString();
        //                            //Session["NavBarVisible"] = "UserPermission";
        //                            //DataTable dtParent = GKS_BL.BL_ExecuteParamSP("uspWebMenuPermission", 1, null);
        //                            //DataTable dtPermission = GKS_BL.BL_ExecuteParamSP("uspWebMenuPermission", 2, Convert.ToInt32(Session["LoginUserID"]));
        //                            //Session["dtParent"] = dtParent;
        //                            //Session["dtPermission"] = dtPermission;
        //                            //Random RN = new Random();
        //                            //int LogToken = Convert.ToInt32(RN.Next(100000, 999999));
        //                            //Session["LoginToken"] = LogToken.ToString();
        //                            //Session["ConnStr"] = HttpUtility.UrlEncode(clsEncryptDecrypt.Encrypt(strr));//strr; 
        //                            //Session["APIURL"] = ConfigurationManager.ConnectionStrings["CallAPIURL"].ConnectionString;
        //                            //Session["GAPI"] = clsEncryptDecrypt.Decrypt(ConfigurationManager.ConnectionStrings["GAPIs"].ConnectionString);
        //                            //Session["WEBGKSURL"] = HttpUtility.UrlEncode((ConfigurationManager.ConnectionStrings["WEBGKS"].ConnectionString));
        //                            //DataTable dtAppConfigValues = GKS_BL.BL_ExecuteParamSP("uspLoadAppConfigData", 1);
        //                            //Session["ALFType"] = dtAppConfigValues.Rows[0]["WebSearchbystart"].ToString();
        //                            //DataTable dtcnfg = GKS_BL.BL_ExecuteParamSP("uspWebPrintProfileconfig", 3, 4, 0);
        //                            //Session["DefaultConfigID"] = dtcnfg.Rows.Count > 0 ? dtcnfg.Rows[0][0].ToString() : "0";                                    
        //                            HttpCookie authCookie;
        //                            int sessionLength = 525600;// (aLogon.RememberMe) ? 525600 : 55600; //525600 = one year
        //                            authCookie = new HttpCookie(".aspxauth");
        //                            authCookie.Expires = DateTime.Now.AddMinutes(sessionLength);
        //                            authCookie.Value = Convert.ToString(Session["authvalue"]);
        //                            //if (aLogon.RememberMe)
        //                            //{
        //                            //HttpContext.Request.Cookies.Add(authCookie);
        //                            Response.Cookies.Add(authCookie);
        //                            return RedirectToAction("Index", "Home");
        //                        }
        //                        else
        //                        {
        //                            //return RedirectToAction("LogOut", "LogOff", "LogOn");
        //                            //return LogOff();
        //                            MSG += " ,User Already Login Another Location(1)";
        //                            if (Request.Browser.IsMobileDevice)
        //                            {
        //                                ViewData["SessionAlertMessage"] = "2";//User Already Login Another Location
        //                            }
        //                            return RedirectToAction("Index", "LogOn", new { strMsg = MSG, DevID = DID });

        //                        }
        //                    }
        //                    else
        //                    {
        //                        MSG += " ,User Already Login Another Location(2)";
        //                        //if (string.IsNullOrEmpty(Session["DBName"].ToString()))
        //                        //{
        //                        //    ViewData["AlertMessage"] = "DBName is cleared in Session";
        //                        //}
        //                        HttpCookie cookie = new HttpCookie(".aspxauth");
        //                        cookie.Expires = DateTime.Now.AddDays(-1);
        //                        Response.Cookies.Add(cookie);
        //                        return RedirectToAction("Index", "LogOn", new { strMsg = MSG, DevID = DID });
        //                    }
        //                }
        //                else
        //                {
        //                    MSG += " ,Invalid .aspxauth Cookies Value";
        //                    ViewData["SessionAlertMessage"] = "3";//Invalid .aspxauth Cookies Value
        //                    return RedirectToAction("Index", "LogOn", new { strMsg = MSG, DevID = DID });
        //                }
        //            }
        //            else
        //            {
        //                MSG += " ,.aspxauth Cookies Value Cleared";
        //                ViewData["SessionAlertMessage"] = "1";//Cookies Cleared
        //                return RedirectToAction("Index", "LogOn", new { strMsg = MSG, DevID = DID });
        //            }
        //        }
        //        else
        //        {
        //            MSG += " ,Your Device Cannot Approved. Contact Admin";
        //            ViewData["AlertMessage"] = "Your Device Cannot Approved. Contact Admin";
        //            return RedirectToAction("Index", "LogOn", new { strMsg = MSG, DevID = DID });
        //        }
        //    }
        //    else if (dtDev.Columns.Count == 1)
        //    {
        //        MSG += " ,New Device for Approval.";
        //        HttpCookie cokk = new HttpCookie("Verify");
        //        cokk.Values.Add("ID", dtDev.Rows[0][0].ToString());
        //        Response.Cookies.Add(cokk);
        //        Session["DevID"] = dtDev.Rows[0][0].ToString();
        //        DID = dtDev.Rows[0][0].ToString();
        //        return RedirectToAction("Index", "LogOn", new { strMsg = MSG, DevID = DID });
        //        //ViewData["AlertMessage"] = "Activate your Device to Access. Contact Admin";
        //        //return View();
        //    }
        //    else
        //    {
        //        ViewData["AlertMessage"] = "Your Device not Found";
        //        return RedirectToAction("Index", "Verify");
        //    }
        //}
    }
}
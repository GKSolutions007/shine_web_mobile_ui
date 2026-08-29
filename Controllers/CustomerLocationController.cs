using ShineWebMobile.Models;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace ShineWebMobile.Controllers
{
    public class CustomerLocationController : Controller
    {
        // GET: CustomerLocation
        public ActionResult Index(string Name, string strFormID, string TypeID, string TranID, string SMID)
        {
            if (Session["LoginUserID"] == null)
            {
                return RedirectToAction("Index", "LogOn");
            }
            else
            {
                //Name = clsEncryptDecrypt.Decrypt(Name);
                //string decFormID = clsEncryptDecrypt.Decrypt(strFormID);
                ViewData["FormName"] = Name;
                DataTable dtPermission = (System.Data.DataTable)Session["dtPermission"];
                int UID = Convert.ToInt32(Session["LoginUserID"]);
                string AssignInvWise = dtPermission.Select("MenuID = 544", null).Length > 0 || UID == 1 ? "1" : "0";
                string Customerwise = dtPermission.Select("MenuID = 545", null).Length > 0 || UID == 1 ? "1" : "0";

                SingleMasterModel dam = new SingleMasterModel();
                dam.FormName = Name;
                dam.TransType = TypeID;
                dam.TransID = TranID;
                dam.AssignInvoicewise = AssignInvWise;
                dam.Customerwise = Customerwise;
                return View(dam);
            }
        }
    }
}
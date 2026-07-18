using ShineWebMobile.Models;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace ShineWebMobile.Controllers
{
    public class MobileDeliveryController : Controller
    {
        // GET: MobileDelivery
        public ActionResult Index(string Name, string strFormID, string TypeID, string TranID)
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
                string CanPerm = dtPermission.Select("MenuID = 504", null).Length > 0 || UID == 1 ? "1" : "0";
                string CompletePerm = dtPermission.Select("MenuID = 503", null).Length > 0 || UID == 1 ? "1" : "0";
                //ViewData["FormID"] = decFormID;
                SingleMasterModel dam = new SingleMasterModel();
                dam.FormName = Name;
                dam.TransType = TypeID;
                dam.TransID = TranID;
                dam.Modify = CompletePerm;
                dam.Cancel = CanPerm;
                return View(dam);
            }
        }
    }
}
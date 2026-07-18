using ShineWebMobile.Models;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Xml.Linq;

namespace ShineWebMobile.Controllers
{
    public class MobileAssignInvoicesController : Controller
    {
        // GET: MobileAssignInvoices
        public ActionResult Index(string Name, string strFormID)
        {
            if (Session["LoginUserID"] == null)
            {
                return RedirectToAction("Index", "LogOn");
            }
            else
            {
                ViewData["FormName"] = Name;
                //ViewData["FormID"] = decFormID;
                DataTable dtPermission = (System.Data.DataTable)Session["dtPermission"];
                int UID = Convert.ToInt32(Session["LoginUserID"]);
                string AddPerm = dtPermission.Select("MenuID = 332", null).Length > 0 || UID == 1 ? "1" : "0";
                string ModPerm = dtPermission.Select("MenuID = 333", null).Length > 0 || UID == 1 ? "1" : "0";
                string ViewPerm = dtPermission.Select("MenuID = 335", null).Length > 0 || UID == 1 ? "1" : "0";
                string CanPerm = dtPermission.Select("MenuID = 334", null).Length > 0 || UID == 1 ? "1" : "0";
                string RtnPerm = dtPermission.Select("MenuID = 336", null).Length > 0 || UID == 1 ? "1" : "0";
                SingleMasterModel dam = new SingleMasterModel();
                dam.FormName = Name;
                dam.Add = AddPerm;
                dam.Modify = ModPerm;
                dam.View = ViewPerm;
                dam.Cancel = CanPerm;
                dam.Return = RtnPerm;
                return View(dam);
            }
        }
    }
}
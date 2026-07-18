using ShineWebMobile.Models;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace ShineWebMobile.Controllers
{
    public class CustomerController : Controller
    {
        // GET: Customer
        public ActionResult Index(string Name, string strFormID)
        {
            if (Session["LoginUserID"] == null)
            {
                return RedirectToAction("Index", "LogOn");
            }
            else
            {
                ViewData["FormName"] = Name;
                int UID = Convert.ToInt32(Session["LoginUserID"]);
                DataTable dtPermission = (System.Data.DataTable)Session["dtPermission"];
                string editprice = dtPermission.Select("MenuID = 326", null).Length > 0 || UID == 1 ? "1" : "0";
                string AddPerm = dtPermission.Select("MenuID = 493", null).Length > 0 || UID == 1 ? "1" : "0";
                string ModPerm = dtPermission.Select("MenuID = 494", null).Length > 0 || UID == 1 ? "1" : "0";
                string ViewPerm = dtPermission.Select("MenuID = 495", null).Length > 0 || UID == 1 ? "1" : "0";
                SingleMasterModel dam = new SingleMasterModel();
                dam.FormName = Name;
                dam.EnablePrice = editprice;
                dam.Add = AddPerm;
                dam.Modify = ModPerm;
                dam.View = ViewPerm;
                return View(dam);
            }
        }
    }
}
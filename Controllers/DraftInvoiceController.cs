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
    public class DraftInvoiceController : Controller
    {
        // GET: DraftInvoice
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
                string editprice = dtPermission.Select("MenuID = 326", null).Length > 0 ? "1" : "0";
                SingleMasterModel dam = new SingleMasterModel();
                dam.FormName = Name;
                dam.EnablePrice = editprice;
                return View(dam);
            }
        }
    }
}
using ShineWebMobile.Models;
using ShineWebMobile.Validations;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Security.Cryptography;
using System.Web;
using System.Web.Mvc;

namespace ShineWebMobile.Controllers
{
    public class DailyActivityController : Controller
    {
        // GET: DailyActivity
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
                string editprice = dtPermission.Select("MenuID = 326", null).Length > 0 || UID == 1 ? "1" : "0";
                string AddPerm = dtPermission.Select("MenuID = 469", null).Length > 0 || UID == 1 ? "1" : "0";
                string ModPerm = dtPermission.Select("MenuID = 470", null).Length > 0 || UID == 1 ? "1" : "0";
                string ViewPerm = dtPermission.Select("MenuID = 471", null).Length > 0 || UID == 1 ? "1" : "0";
                string AllUserDataPerm = dtPermission.Select("MenuID = 466", null).Length > 0 || UID == 1 ? "1" : "0";

                string ProductFilter = dtPermission.Select("MenuID = 532", null).Length > 0 || UID == 1 ? "1" : "0";
                string CategoryFilter = dtPermission.Select("MenuID = 531", null).Length > 0 || UID == 1 ? "1" : "0";
                string ManufacturerFilter = dtPermission.Select("MenuID = 530", null).Length > 0 || UID == 1 ? "1" : "0";
                string Feedback = dtPermission.Select("MenuID = 529", null).Length > 0 || UID == 1 ? "1" : "0";
                string NoOrder = dtPermission.Select("MenuID = 528", null).Length > 0 || UID == 1 ? "1" : "0";
                string OrderTaken = dtPermission.Select("MenuID = 527", null).Length > 0 || UID == 1 ? "1" : "0";

              
                SingleMasterModel dam = new SingleMasterModel();
                dam.FormName = Name;
                dam.EnablePrice = editprice;
                dam.TransType = TypeID;
                dam.TransID = TranID;
                dam.Add = AddPerm;
                dam.Modify = ModPerm;
                dam.View = ViewPerm;
                dam.ShowAllUserData = AllUserDataPerm;
                dam.OrderTaken = OrderTaken;
                dam.ManufacturerFilter = ManufacturerFilter;
                dam.Feedback = Feedback;
                dam.NoOrder = NoOrder;
                dam.ProductFilter = ProductFilter;
                dam.CategoryFilter= CategoryFilter;
                return View(dam);
            }
        }
    }
}
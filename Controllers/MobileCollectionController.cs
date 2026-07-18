using ShineWebMobile.Models;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace ShineWebMobile.Controllers
{
    public class MobileCollectionController : Controller
    {
        // GET: MobileCollection
        public ActionResult Index(string Name, string strFormID, string TypeID, string TranID,string SMID)
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
                string AddPerm = dtPermission.Select("MenuID = 463", null).Length > 0 || UID == 1 ? "1" : "0";
                string ModPerm = dtPermission.Select("MenuID = 464", null).Length > 0 || UID == 1 ? "1" : "0";
                string ViewPerm = dtPermission.Select("MenuID = 465", null).Length > 0 || UID == 1 ? "1" : "0";
                string AllUserDataPerm = dtPermission.Select("MenuID = 466", null).Length > 0 || UID == 1 ? "1" : "0";

                SingleMasterModel dam = new SingleMasterModel();
                dam.FormName = Name;
                dam.TransType = TypeID;
                dam.TransID = TranID;
                dam.UserID = SMID;
                dam.Add = AddPerm;
                dam.Modify = ModPerm;
                dam.View = ViewPerm;
                dam.ShowAllUserData = AllUserDataPerm;
                return View(dam);
            }
        }
    }
}
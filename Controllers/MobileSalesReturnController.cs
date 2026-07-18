using ShineWebMobile.Models;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace ShineWebMobile.Controllers
{
    public class MobileSalesReturnController : Controller
    {
        // GET: MobileSalesReturn
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
                string AllUserDataPerm = dtPermission.Select("MenuID = 466", null).Length > 0 || UID == 1 ? "1" : "0";

                string SRAddPerm = dtPermission.Select("MenuID = 506", null).Length > 0 || UID == 1 ? "1" : "0";
                string SRModPerm = dtPermission.Select("MenuID = 507", null).Length > 0 || UID == 1 ? "1" : "0";
                string SRViewPerm = dtPermission.Select("MenuID = 508", null).Length > 0 || UID == 1 ? "1" : "0";

                string DRAddPerm = dtPermission.Select("MenuID = 510", null).Length > 0 || UID == 1 ? "1" : "0";
                string DRModPerm = dtPermission.Select("MenuID = 511", null).Length > 0 || UID == 1 ? "1" : "0";
                string DRViewPerm = dtPermission.Select("MenuID = 512", null).Length > 0 || UID == 1 ? "1" : "0";


                //ViewData["FormID"] = decFormID;
                SingleMasterModel dam = new SingleMasterModel();
                dam.FormName = Name;
                dam.EnablePrice = editprice;
                dam.TransType = TypeID;
                dam.TransID = TranID;
                dam.Add = SRAddPerm;
                dam.Modify = SRModPerm;
                dam.View = SRViewPerm;
                dam.ShowAllUserData = AllUserDataPerm;
                dam.Add1 = DRAddPerm;
                dam.Modify1 = DRModPerm;
                dam.View1 = DRViewPerm;
                return View(dam);
            }
        }
    }
}
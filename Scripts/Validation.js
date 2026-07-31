function InputCaseConvert(Type, str) {
    if (Type == 1) {//TitleCase
        return str.replace(
          /\w\S*/g,
          text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
        );
    }
    else if (Type == 2) {// Uppercase
        return str.toUpperCase();
    }
    else if (Type == 3) {//LowerCase
        return str.toLowerCase();
    }
    else if (Type == 4) {//No Case
        return str
    }
}
function scroll(id) {
    window.scrollTo(id.offsetLeft, id.offsetTop);
}
function Trimvalues() {
    $("input,textarea").each(function () {
        $(this).val($.trim($(this).val()));
    });
}

function getCurrentDate() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!
    var yyyy = today.getFullYear();
    if (dd < 10) {
        dd = '0' + dd;
    }

    if (mm < 10) {
        mm = '0' + mm;
    }
    today = yyyy + '-' + mm + '-' + dd;
    return today;
}
function setCurrentDate(fieldID) {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!
    var yyyy = today.getFullYear();
    if (dd < 10) {
        dd = '0' + dd;
    }

    if (mm < 10) {
        mm = '0' + mm;
    }
    today = yyyy + '-' + mm + '-' + dd;
    document.getElementById(fieldID).value = today;
    document.getElementById(fieldID).max = today;
}
function MandatoryValidation(value, errordiv) {
    $(errordiv).html('');
    if (value.val() == '') {
        $(errordiv).html('* Field Should not be Empty');
        showErrorSnackbar("Field Should not be Empty");
        scroll(value);
        return false;
    }
    return true;
}
function MobilenoValidation(value, errordiv, IsMandatory) {
    $(errordiv).html('');
    var strRegex = /^([[0-9]{10,12})+$/;
    if (IsMandatory && !strRegex.test(value.val())) {
        //alert('Mobile no in 10 digits');
        $(errordiv).html('* Mobile Number should contain 10 or 12 digits');
        showErrorSnackbar("Mobile Number should contain 10 or 12 digits");
        scroll(value);
        return false;
    }
    else if (!IsMandatory && !strRegex.test(value.val()) && value.val().length > 0) {
        $(errordiv).html('* Mobile Number should contain 10 or 12 digits');
        showErrorSnackbar("Mobile Number should contain 10 or 12 digits");
        return false;
    }
    return true;
}
function PhonenoValidation(value, errordiv, IsMandatory) {
    $(errordiv).html('');
    var strRegex = /^([[0-9]{10,12})+$/;
    if (IsMandatory && !strRegex.test(value.val())) {
        //alert('Mobile no in 10 digits');
        $(errordiv).html('* Phone Number should contain 10 or 12 digits ');
        showErrorSnackbar('Phone Number should contain 10 or 12 digits ');
        scroll(value);
        return false;
    }
    else if (!IsMandatory && !strRegex.test(value.val()) && value.val().length > 0) {
        $(errordiv).html('* Phone Number should contain 10 or 12 digits ')
        showErrorSnackbar('Phone Number should contain 10 or 12 digits ')
        return false;
    }
    return true;
}
function EmailValidation(value, errordiv, IsMandatory) {
    $(errordiv).html('');
    var strRegex = /^([a-zA-Z0-9_\.\-\+])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    if (IsMandatory && !strRegex.test(value.val())) {
        $(errordiv).html('* Invalid Email Format (Ex. example@email.com)');;
        showErrorSnackbar("Invalid Email Format (Ex. example@email.com)");
        scroll(value);  
        return false;
    }
    else if (IsMandatory && value.val().length == 0) {
        $(errordiv).html('* Email ID should not be empty')
        showErrorSnackbar("Email ID should not be empty");
        scroll(value);
        return false;
    }
    else if (!IsMandatory && !strRegex.test(value.val()) && value.val().length > 0) {
        $(errordiv).html('* Invalid Email Format (Ex. example@email.com)')
        showErrorSnackbar(" Invalid Email Format (Ex. example@email.com)");
        scroll(value);  
        return false;
    }
    return true;
}
function AadharValidation(value, errordiv) {
    $(errordiv).html('');
    var strRegex = /^([[0-9]{12})+$/;
    if (!strRegex.test(value.val()) && value.val().length > 0) {// && value.val().length > 0
        $(errordiv).html('* Aadhar Number Should be 12 Digits');
        showErrorSnackbar('Aadhar Number Should be 12 Digits');
        scroll(value);
        return false;
    }
    return true;
}
function PANValidation(value, errordiv, IsMandatory) {
    var strRegex = /^([a-zA-Z]{5}\d{4}[a-zA-Z]{1})+$/;
    $(errordiv).html('');
    if (IsMandatory && !strRegex.test(value.val())) {
        $(errordiv).html('*PAN must 10 characters (alphabets-5 numeric-4 alphabet-1)');
        showErrorSnackbar("PAN must 10 characters (alphabets-5 numeric-4 alphabet-1)");
        scroll(value);
        return false;
    }
    else if (!IsMandatory && !strRegex.test(value.val()) && value.val().length > 0) {
        $(errordiv).html('*PAN must 10 characters (alphabets-5 numeric-4 alphabet-1)');
        showErrorSnackbar("PAN must 10 characters (alphabets-5 numeric-4 alphabet-1)");
        scroll(value);
        return false;
    }
    return true;
}
function MICRValidation(value, errordiv) {
    $(errordiv).html('');
    var strRegex = /^([0-9]{9})+$/;
    if (!strRegex.test(value.val()) && value.val().length > 0) {
        $(errordiv).html('* MICR Should be 9 Digits');
        showErrorSnackbar("MICR Should be 9 Digits");
        scroll(value);
        return false;
    }
    return true;
}
function IFSCValidation(value, errordiv) {
    $(errordiv).html('');
    var strRegex = /^([a-zA-Z]{4}0[0-9A-Za-z]{6})+$/; // OLD
    //var strRegex = "^(?=.*[a-zA-Z]{4})([a-z0-9]{7,})+$";
    //(?=[^0-9]*[0-9])(?=[^A-Za-z]*[A-Za-z])
    if (!strRegex.test(value.val()) && value.val().length > 0) {
        $(errordiv).html('*Invalid IFSC format (alphabets-4, alphanumeric-7)');
        showErrorSnackbar("Invalid IFSC format (alphabets-4, alphanumeric-7)");
        scroll(value);
        return false;
    }
    return true;
}
function GSTINValidation(value, errordiv) {
    $(errordiv).html('');
    var strRegex = /^([0-9]{2}[a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1}[0-9a-zA-Z]{3})+$/;
    if (!strRegex.test(value.val()) && value.val().length > 0) {
        $(errordiv).html('GSTIN Number Must 15 characters (Numeric-2 Alpha-5 Numeric-4 Alpha-1 AlphaNumeric-3)');
        showErrorSnackbar("GSTIN Number Must 15 characters (Numeric-2 Alpha-5 Numeric-4 Alpha-1 AlphaNumeric-3)");
        scroll(value);
        return false;
    }
    return true;
}
function FSSAIValidation(value, errordiv) {
    $(errordiv).html('');
    var strRegex = /^([[0-9]{14})+$/;
    if (!strRegex.test(value.val()) && value.val().length > 0) {
        $(errordiv).html('*Invalid FSSAI format (14 Numerics Only)');
        showErrorSnackbar("Invalid FSSAI format (14 Numerics Only)");
        scroll(value);
        return false;
    }
    return true;
}
function PINCodeValidation(value, errordiv) {
    $(errordiv).html('');
    var strRegex = /^([0-9]{6})+$/;
    if (!strRegex.test(value.val()) && value.val().length > 0) {
        $(errordiv).html('*Invalid PIN Code format (6 Numerics Only)');
        showErrorSnackbar("Invalid PIN Code format (6 Numerics Only)");
        scroll(value);
        return false;
    }
    return true;
}
function ServiceTaxValidationn(value, errordiv) {
    $(errordiv).html('');
    var strRegex = /^([a-zA-Z0-9]{15})+$/;
    if (!strRegex.test(value.val()) && value.val().length > 0) {
        $(errordiv).html('*Invalid Service Tax format (15 alphanumeric)');
        showErrorSnackbar("Invalid Service Tax format (15 alphanumeric)");
        scroll(value);
        return false;
    }
    return true;
}
function HSNValidation(value, errordiv) {
    $(errordiv).html('');
    var strRegex = /^([0-9]{0,8})+$/;
    if (!strRegex.test(value.val()) && value.val().length > 0) {
        $(errordiv).html('*Invalid HSN Code format (8 Numerics Only)');
        showErrorSnackbar("Invalid HSN Code format (8 Numerics Only)");
        scroll(value);
        return false;
    }
    return true;
}
function SACValidation(value, errordiv) {
    $(errordiv).html('');
    var strRegex = /^([0-9]{0,8})+$/;
    if (!strRegex.test(value.val()) && value.val().length > 0) {
        $(errordiv).html('*Invalid SAC Code format (8 Numerics Only)');
        showErrorSnackbar("Invalid SAC Code format (8 Numerics Only)");
        scroll(value);
        return false;
    }
    return true;
}
function WebsiteValidation(value, errordiv) {
    $(errordiv).html('');
    var strRegex = /^((https?|ftp|smtp):\/\/)?(www.)?[a-z0-9]+(\.[a-z]{2,}){1,3}(#?\/?[a-zA-Z0-9#]+)*\/?(\?[a-zA-Z0-9-_]+=[a-zA-Z0-9-%]+&?)?$/;
    if (!strRegex.test(value.val()) && value.val().length > 0) {
        $(errordiv).html('Invalid Website format');
        showErrorSnackbar("Invalid Website format");
        scroll(value);
        return false;
    }
    return true;
}
function AlphaNumericwithSplchar(value, errordiv) {
    $(errordiv).html('');
    var strRegex = /^[ A-Za-z0-9-_&*.,)(@@%]*$/
    if (!strRegex.test(value)) {
        $(errordiv).html('*Invalid special character');        
        return false;
    }
    return true;
}
function AlphaorNumericonly(value, errordiv) {
    $(errordiv).html('');
    var strRegex = /^[A-Za-z0-9]*$/
    if (!strRegex.test(value)) {
        $(errordiv).html('*Invalid special character');
        return false;
    }
    return true;
}
function Alphaonly(value, errordiv) {
    $(errordiv).html('');
    var strRegex = /^[A-Za-z]*$/
    if (strRegex.test(value)) {
        $(errordiv).html('*Invalid format(Must be Numeric only or Alphanumeric only)');
        showErrorSnackbar("Invalid format(Must be Numeric only or Alphanumeric only)");
        return false;
    }
    return true;
}
function AlphaAndNumericonly(value, errordiv) {
    $(errordiv).html('');
    var strRegex = /^(?=[^0-9]*[0-9])(?=[^A-Za-z]*[A-Za-z])\w+\Z*$/
    if (!strRegex.test(value)) {
        $(errordiv).html('*Invalid format(Must contain Alpha and Numeric)');
        showErrorSnackbar("Invalid format(Must contain Alpha and Numeric)");
        return false;
    }
    return true;
}
function Numericonly(value, errordiv) {
    $(errordiv).html('');
    var strRegex = /^[0-9]*$/
    if (!strRegex.test(value)) {
        $(errordiv).html('*Numbers only allowed');        
        return false;
    }
    return true;
}
function NumericwithDotonly(value, errordiv) {
    $(errordiv).html('');
    var Alphanumer = /^[0-9.]*$/
    if (!strRegex.test(value)) {
        $(errordiv).html('*Numbers only allowed');
        return false;
    }
    return true;
}
function allowAlphanumericOnly(selector) {
    // Input filtering
    document.querySelectorAll(selector).forEach(function (input) {
        input.addEventListener('input', function () {
            this.value = this.value.replace(/[^a-zA-Z0-9]/g, '');
        });

        // Optional: Prevent paste of invalid characters
        input.addEventListener('paste', function (e) {
            const pasted = (e.clipboardData || window.clipboardData).getData('text');
            if (/[^a-zA-Z0-9]/.test(pasted)) {
                e.preventDefault();
            }
        });
    });
}

function showSuccessSnackbar(message) {
    const toastBox = document.querySelector('.toastBox');
    let toastTimeout;
    let existingToast;
    // If a toast is already present, remove it before creating a new one
    if (existingToast) {
        clearTimeout(toastTimeout);
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.classList.add('toastSuccess');
    toast.innerHTML = `<button class="close-btn-sb">X</button><i class="fas fa-check-circle"></i> ${message}`;
    toastBox.appendChild(toast);
    existingToast = toast;

    const closeButton = toast.querySelector('.close-btn-sb');
    closeButton.addEventListener('click', () => {
        toast.remove();
        clearTimeout(toastTimeout);
        existingToast = null;
    });

    toastTimeout = setTimeout(() => {
        toast.remove();
        existingToast = null;
    }, 3000);
}
function showErrorSnackbar(message) {
    const toastBox = document.querySelector('.toastBox');
    let toastTimeout;
    let existingToast;
    // If a toast is already present, remove it before creating a new one
    if (existingToast) {
        clearTimeout(toastTimeout);
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.classList.add('toastError');
    toast.innerHTML = `<button class="close-btn-sb">X</button><i class="fas fa-remove"></i> ${message}`;
    toastBox.appendChild(toast);
    existingToast = toast;

    const closeButton = toast.querySelector('.close-btn-sb');
    closeButton.addEventListener('click', () => {
        toast.remove();
        clearTimeout(toastTimeout);
        existingToast = null;
    });

    toastTimeout = setTimeout(() => {
        toast.remove();
        existingToast = null;
    }, 3000);
}
function setDate(FieldID, Type) {
    $.ajax({
        //url: Url.Action("setdate", "Home"),
        url: "Home/setdate",
        type: 'get',
        contentType: 'json',
        data: { TypeID: Type },
        success: function (data) {
            $.each(data, function (i, items) {
                $("#" + FieldID).attr("max", items.MaxDate);
                $("#" + FieldID).attr("min", items.MinDate);
                $("#" + FieldID).val(items.Value);
            });
        }, error: function (data) {
            if (data.status == "401") {
                var msg = data.responseJSON.Message;
                //showErrorSnackbar(msg + " Logout and Login again.");
            }
        }
    })
}
function SetFilterDate() {
    var sel = $("#cmbFilterDatetype").val();// e.target.value;
    if (sel == 1)//CD
    {
        setDate("dtpFFrom", 0);
        setDate("dtpFTo", 0);
    }
    else if (sel == 2)//PMFD
    {
        setDate("dtpFFrom", 2);
        setDate("dtpFTo", 0);
    }
    else if (sel == 3)//PMFD
    {
        setDate("dtpFFrom", 6);
        setDate("dtpFTo", 7);
    }
    else if (sel == 4)//FSC
    {
        setDate("dtpFFrom", 1);
        setDate("dtpFTo", 0);
    }
}
document.addEventListener("keydown", function (event) {
    if (event.key === "F5") {        
        event.preventDefault();
        var IsEnable = $("#btnSave").is(":disabled");
        var IsVisible = $("#btnSave").is(":visible");        
        if (!IsEnable && IsVisible)
            $("#btnSave").click();
    }
    if (event.key === "F6") {
        event.preventDefault();
        var IsEnable = $("#btnClear").is(":disabled");
        var IsVisible = $("#btnClear").is(":visible");      
        if (!IsEnable && IsVisible)
            $("#btnClear").click();
    }
    if (event.altKey && event.key.toLowerCase() === "x") {
        event.preventDefault();
        var IsEnable = $("#btnClose").is(":disabled");
        var IsVisible = $("#btnClose").is(":visible");
        if (!IsEnable && IsVisible)
            $("#btnClose").click();
    }
});
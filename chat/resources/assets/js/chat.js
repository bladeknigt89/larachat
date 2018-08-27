var serverOnline = false;
var refreshMessages = null;
var connecToServer= null;
var connAddr = '';
var userId = '';
var token = '';
var selfData = {sender_id: userId, reciever_id: '', message: "", messageId: ''};
var conn=null;
var fileName =  'messages.html';

function connectToServer() {
    if (serverOnline == false) {
        clearTimeout(connecToServer);
        conn = null;
        var connect = new WebSocket('ws://' + connAddr + '?user_id=' + userId + '&&token=' + token);
        connect.onopen = function (e) {
            serverOnline = true;
            clearTimeout(connecToServer);
            console.log("Connection established!");
            clearTimeout(refreshMessages);
            conn = connect;
        };
        connect.onerror = function (ev) {
            console.log('Error..');
            console.log(ev);
            serverOnline = false;
            clearTimeout(connecToServer);
            connecToServer = setTimeout(function () {
                if (serverOnline == false) {
                    conn = null;
                    console.log('Reconnecting...');
                    connect = connectToServer();
                }
            }, 20000);
        };
        connect.onmessage = function (e) {
            var msgdata = JSON.parse(e.data);
            addnewMessageToList(msgdata);
            refreshContactList();
        };
        connect.onclose = function (ev) {
            conn = null;
            clearTimeout(connecToServer);
            serverOnline = false;
            refreshMessages = setTimeout(function () {
                getMessages(selfData.reciever_id);
            }, 60000);
        }
    }
}


function getMessages(userId) {
    selfData.reciever_id = userId;
    var url = $("#ajaxlistMessagesLink").val();
    $("#selectDiv").addClass('hidden');
    callAjax(url, JSON.stringify({
        "contactId": userId
    }), cbf);
}


var cbf = function (data) {
    var listHolder = $("#scroll-to-last");
    listHolder.html('');
    $.each(data.data, function (id, message) {
        if ((message.sender_id == data.currentUserId && message.reciever_id == data.userId) || (message.sender_id == data.userId && message.reciever_id == data.currentUserId)) {

            if (message.sender_id == data.currentUserId) {
                var listElement = ' <li class="list-group-item messages-sent-name gray-bg">' +
                    '<a data-toggle="tooltip" title="at: ' + message.created_at + '"><strong>' + message.senderName + '</strong></a>' +
                    '</li>' +
                    '<li class="list-group-item messages-sent-message">' +
                    '<div><p class="messageParagraph">' + message.message + '</p></div>' +
                    '</li>';
            }
            else {
                var listElement = '<li class="list-group-item messages-inbox-name gray-bg">' +
                    '<a data-toggle="tooltip" title="at:' + message.created_at + '"><strong>' + message.senderName + '</strong></a>' +
                    '</li>' +
                    '<li class="list-group-item messages-inbox-message">' +
                    '<div><p class="messageParagraph">' + message.message + '<p></div>' +
                    '</li>'
            }
            listHolder.append(listElement);
        }

    });

    $.each($(".messageParagraph"), function (id, input) {
        var inputText = input.innerHTML;
        var output = emojione.toImage(inputText);
        input.innerHTML = output;
    });


    $("#sender_id").val(data.currentUserId);
    $("#reciever_id").val(data.userId);

    if (data.data.length > 0) {
        listHolder.removeClass('hidden');
        $("#messageForm").removeClass('hidden');
        $("#downloadLink").removeClass('hidden');
    }

    scrollMessages();

    setTimeout(function () {
        refreshContactList();
    }, 45000);

    if (serverOnline == false) {
        refreshMessages = setTimeout(function () {
            getMessages(data.userId);
        }, 60000);
        connectToServer();
    }

};


function addnewMessageToList(message) {
    var listHolder = $("#scroll-to-last");
    if ((message.sender_id == selfData.reciever_id && message.reciever_id == userId) || (message.sender_id == selfData.sender_id && message.reciever_id == selfData.reciever_id)) {
        if (message.sender_id == userId) {
            var listElement = ' <li class="list-group-item messages-sent-name gray-bg">' +
                '<a data-toggle="tooltip" title="at: ' + message.created_at + '"><strong>' + message.name + '</strong></a>' +
                '</li>' +
                '<li class="list-group-item messages-sent-message">' +
                '<div><p class="messageParagraph">' + message.msg + '</p></div>' +
                '</li>';
        }
        else {
            var listElement = '<li class="list-group-item messages-inbox-name gray-bg">' +
                '<a data-toggle="tooltip" title="at:' + message.created_at + '"><strong>' + message.name + '</strong></a>' +
                '</li>' +
                '<li class="list-group-item messages-inbox-message">' +
                '<div><p class="messageParagraph">' + message.msg + '<p></div>' +
                '</li>'
        }
        listHolder.append(listElement);
    }

    scrollMessages();

    $.each($(".messageParagraph"), function (id, input) {
        var inputText = input.innerHTML;
        var output = emojione.toImage(inputText);
        input.innerHTML = output;
    });
}

var refreshList = function (data) {
    console.log(serverOnline);
    if (data.success == true) {
        $("#alertDiv").addClass('alert alert-success');
        $("#alertDiv").html(data.message);
        selfData.messageId = data.messageId;
        if (serverOnline == true) {
            conn.send(JSON.stringify(selfData));
        }
    }
    else {
        $("#alertDiv").html(data.message);
        $("#alertDiv").addClass('alert alert-danger');
    }

    var el = $("#message").emojioneArea();
    el[0].emojioneArea.setText('');
};

function sendMessage() {
    var url = $("#ajaxSendMessageLink").val();
    var message = emojione.toShort($("#message").val());
    var postData = {
        sender_id: $("#sender_id").val(),
        reciever_id: $("#reciever_id").val(),
        message: message
    };
    selfData.message = message;
    var postObject = JSON.stringify(postData);
    callAjax(url, postObject, refreshList);
    getMessages($("#reciever_id").val());
    refreshContactList();
}


var changeContactListElements = function (data) {
    var noMessage = $("#no_unread_message").val();
    var listHolder = $(".contacts-group");
    listHolder.html('');
    $.each(data.data, function (id, contact) {
        var listItem = '<li class="list-group-item">' + '<a class="list-group-link" href="#" onclick="getMessages(' + contact.user_id + ')">' +
            '<div class="row no-padding">' +
            '<div class="col-4 col-md-12 col-lg-3 margin-bottom-small-mobile">';
        if (contact.img != null) {
            listItem += '<img src="/uploads/' + contact.img + '">';
        }
        else {
            listItem += '<img src="/assets/images/profile-image-placeholder.png">';
        }

        listItem +=
            '</div>' +
            '<div class="col-8 col-md-12 col-lg-9">';
        if (contact.type == 'student') {
            listItem += '<span class="view-profile-link" data-link="/student/' + contact.user_id + '" data-toggle="tooltip" title="View Profile">' + contact.name + '</span>';
        }
        else {
            listItem += '<span class="view-profile-link" data-link="/teacher/' + contact.user_id + '" data-toggle="tooltip" title="View Profile">' + contact.name + '</span>';
        }
        if (contact.no_unread_message == 0) {
            listItem += '<p>' + noMessage + '</p>';
        }
        else {
            listItem += '<p>Unread messages:' + contact.no_unread_message + '</p>';
        }
        listItem +=
            '</div>' +
            '</div' +
            '</a>' +
            '</li>';
        listHolder.append(listItem);
    })
};

function refreshContactList() {
    var url = $("#ajaxContactsLink").val();
    callAjax(url, JSON.stringify({
        contact: 'contact'
    }), changeContactListElements);
}

function downloadInnerHtml(filename, elId, mimeType) {
    var elHtml = document.getElementById(elId).innerHTML;
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(new Blob([elHtml], {type: mimeType + ';charset=utf-8;'}), filename);
    } else {
        var link = document.createElement('a');
        mimeType = mimeType || 'text/plain';

        link.setAttribute('download', filename);
        link.setAttribute('href', 'data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(elHtml));
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function scrollMessages() {
    $('#scroll-to-last').animate({scrollTop: $('#scroll-to-last').prop("scrollHeight") + 30}, 500);
}


$(document).ready(function () {
    connAddr = $("#connAddr").val();
    userId = $("#sender_id").val();
    token = $("#token").val();
    conn = connectToServer();
});





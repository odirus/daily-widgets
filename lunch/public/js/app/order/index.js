"use strict";

require(['../../common'], function(common) {
    require(['jquery', 'bootstrap'], function($, bootstrap) {
	//加载修改用户名的控件
	generateChangeUsernameControl($);
	//用户修改姓名的功能
	$('button.save-new-username').click(function() {
	    saveUsernameToLocal($);
	    loadAndWriteUsername($);
	    closeChangeUsernameControl($);
	});
	//初始化页面事务
	$(document).ready(function() {
	    //加载并刷新用户姓名
	    loadAndWriteUsername($);
	    //加载可用菜单
	    loadAndWriteAvailableMenu($);
	});
    });
});

//用户名
var localUsername;
//生成修改用户名的控件
var generateChangeUsernameControl = function($) {
    $('.welcome-change-username').click(function() {
	$('#change-username-modal').modal('show');
    });
};
//关闭修改用户名的控件
var closeChangeUsernameControl = function($) {
    $('#change-username-modal').modal('hide');
};
//保存用户存储的用户名
var saveUsernameToLocal = function($) {
    var newUsername = $('.modal-new-username').val();
    
    localUsername = newUsername;
    localStorage.setItem('lunch-username', newUsername);
};
//加载并刷新用户姓名
var loadAndWriteUsername = function($) {
    var username;

    username = localStorage.getItem('lunch-username');
    if (username === null || username === '') {
	username = '火星人';
	localStorage.setItem('lunch-username', username);
    }
    $('.var-username').text(username);
    localUsername = username;
};
//加载用户订单
var loadAndWriteUserOrder = function($, availableMenu) {
    $.ajax({
	url: "/order/userOrder?username=" + localUsername,
	type: "GET",
	dataType: "json",
	success: function(data, textStatus, jqXHR) {
	    if (textStatus === 'success') {
		writeUserOrder($, data, availableMenu);
	    }
	}
    });
};
//刷新用户订单
var writeUserOrder = function($, userOrder, availableMenu) {
    //删除过期信息
    $('.user-order-item').remove();
    for (var index in userOrder) {
	if (availableMenu[index] && typeof availableMenu[index] !== 'undefined') {
	    var userOrderItemInstance = $('.user-order-item-template').clone();
	    
	    userOrderItemInstance.attr('class', 'user-order-item');
	    userOrderItemInstance.children(':nth-child(1)').text(index);
	    userOrderItemInstance.children(':nth-child(2)').text(availableMenu[index]['name']);
	    userOrderItemInstance.children(':nth-child(3)').text(availableMenu[index]['price']);
	    userOrderItemInstance.children(':nth-child(4)').text(userOrder[index]);
	    $('table.user-order > tbody').append(userOrderItemInstance);
	}
    }
};
//加载并刷新可用菜单
var loadAndWriteAvailableMenu = function($) {
    $.ajax({
	url: "/order/availableMenu",
	type: "GET",
	dataType: "json",
	success: function(data, textStatus, jqXHR) {
	    if (textStatus === 'success') {
		writeAvailableMenu($, data);
	    }
	}
	//@todo when failed
    });
};
//刷新可用菜单
var writeAvailableMenu = function($, availableMenu) {
    for (var index in availableMenu) {
	var availableMenuItemInstance = $('.available-menu-item-template').clone();
	
	availableMenuItemInstance.attr('class', 'available-menu-item');
	availableMenuItemInstance.children(':nth-child(1)').text(index);
	availableMenuItemInstance.children(':nth-child(2)').text(availableMenu[index]['name']);
	availableMenuItemInstance.children(':nth-child(3)').text(availableMenu[index]['price']);
	$('table.available-menu > tbody').append(availableMenuItemInstance);
    }
    //加载用户订单
    loadAndWriteUserOrder($, availableMenu, localUsername);
    //加载购物按钮
    loadOrderClick($, availableMenu);
    //加载购物车信息
    loadAndWriteShoppingCart($, availableMenu);
    //加载提交购物车按钮
    loadSubmitShoppingCart($, availableMenu, localUsername);
    //加载取消订单按钮
    loadCancelShoppingCart($);
};
//加载购物按钮
var loadOrderClick = function($, availableMenu) {
    $('.new-order-confirm').click(function() {
	var id = $(this).parent().parent().children(':nth-child(1)').text();
	var count = localStorage.getItem('lunch-food-' + id) || 0;
	
	localStorage.setItem('lunch-food-' + id, parseInt(count) + 1);
	//加载购物车信息
	loadAndWriteShoppingCart($, availableMenu);
    });
};
//加载购物车信息
var loadAndWriteShoppingCart = function($, availableMenu) {
    var shoppingCart = {};
    
    for (var index in availableMenu) {
	var itemCount = parseInt(localStorage.getItem('lunch-food-' + index));

	if (itemCount > 0) {
	    shoppingCart[index] = itemCount;
	}
    }
    //删除之前的节点信息
    $('.user-shopping-cart-item').remove();
    //重新渲染节点信息
    for (var prop in shoppingCart) {
	var userShoppingCartInstance = $('.user-shopping-cart-item-template').clone();

	userShoppingCartInstance.attr('class', 'user-shopping-cart-item');
	userShoppingCartInstance.children(':nth-child(1)').text(prop);
	userShoppingCartInstance.children(':nth-child(2)').text(availableMenu[prop].name);
	userShoppingCartInstance.children(':nth-child(3)').text(availableMenu[prop].price);
	userShoppingCartInstance.children(':nth-child(4)').text(shoppingCart[prop]);
	$('table.user-shopping-cart > tbody').append(userShoppingCartInstance);
    }
};
//加载提交购物按钮
var loadSubmitShoppingCart = function($, availableMenu) {
    $('.submit-order').click(function() {
	var shoppingCart = {};
	
	for (var index in availableMenu) {
	    var itemCount = parseInt(localStorage.getItem('lunch-food-' + index));
	    
	    if (itemCount > 0) {
		shoppingCart[index] = itemCount;
	    }
	}
	//提交信息到服务器
	$.ajax({
	    url: "/order/submitOrder",
	    type: "POST",
	    data: {
		username: localUsername,
		order: JSON.stringify(shoppingCart)
	    },
	    success: function(data, textStatus, jqXHR) {
		if (textStatus === 'success') {
		    //清理本地信息
		    clearShoppingCart($, availableMenu, localUsername);
		    //刷新订单信息
		    loadAndWriteUserOrder($, availableMenu, localUsername);
		}
	    }
	});
    });
};
//加载取消按钮
var loadCancelShoppingCart = function($, availableMenu) {
    $('.cancel-order').click(function() {
	//提交信息到服务器
	$.ajax({
	    url: "/order/userOrder?username=" + localUsername,
	    type: "DELETE",
	    success: function(data, textStatus, jqXHR) {
		if (textStatus === 'success') {
		    //刷新订单信息
		    loadAndWriteUserOrder($, availableMenu);
		}
	    }
	});
    });
};
//删除本地的存储信息
var clearShoppingCart = function($, availableMenu) {
    var shoppingCart = {};
    
    for (var index in availableMenu) {
	localStorage.removeItem('lunch-food-' + index);
    }
    //加载购物车
    loadAndWriteShoppingCart($, availableMenu, localUsername);
};
//计算对象自有属性数量
function countObjProperties(obj) {
    var count = 0;
    
    for (var prop in obj) {
	if (obj.hasOwnProperty(prop)) {
	    ++count;
	}
    }
    
    return count;
};
